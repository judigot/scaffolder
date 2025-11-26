import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useFormStore } from './useFormStore';
import { useTransformationsStore } from './useTransformationsStore';
import { useModalStore } from './useModalStore';
import { consolidateInterfaces } from './utils/common';
import FileViewer from './components/FileViewer';
import { handleCopy } from './helpers/stringHelper';
import SchemaBuilder from './components/SchemaBuilder';
import { CREATION_MODES } from './constants';
import JSONSchemaEditor from './components/JSONSchemaEditor/JSONSchemaEditor';
import convertIntrospectedStructure from './utils/convertIntrospectedStructure';
import useDebouncedValue from './hooks/useDebouncedValue';
import { useUserFiles } from './hooks/useUserFiles';
import { useProjectStore } from './useProjectStore';
import { useMockDatabaseStore } from './useMockDatabaseStore';
import { useFolderStructures } from './frameworks/useFolderStructures';
import UserProfile from './components/UserProfile';
import { useUser } from './hooks/useUser';
import { getApiUrl } from './utils/getApiUrl';
function App() {
  const formData = useFormStore();
  const { user, userMetadata, isLoading: isUserLoading } = useUser();
  const {
    backendUrl,
    backendDir,
    frontendDir,
    dbConnection,
    // framework,
    includeInsertData,
    insertOption,
    includeTypeGuards,
    outputOnSingleFile,
    dbType,
    setMasterSchema,
    setDBType,
    creationMode,
    setCreationMode,
    publicRepoURL,
    setPublicRepoURL,
  } = formData;
  const {
    schemaInfo,
    interfaces,
    SQLSchema,
    mockData,
    deleteTablesQueries,
    directJoins,
    oneToOneJoins,
    aggregateJoins,
    setTransformations,
    setSchemaInfo,
  } = useTransformationsStore();
  const folderStructures = useFolderStructures({
    schemaInfo,
    formData,
  });
  // Use both stores
  const { setUserFiles, typeMappings, dbTypes } = useMockDatabaseStore();
  const {
    projects,
    selectedProject,
    selectProject,
    buildProjectFilesForProject,
    projectBuildCache,
    invalidateProjectCache,
  } = useProjectStore();
  // Invalidate project cache when userMetadata changes
  useEffect(() => {
    if (selectedProject !== null && userMetadata !== null) {
      invalidateProjectCache(selectedProject.name);
    }
  }, [userMetadata, selectedProject, invalidateProjectCache]);
  // Get the project files from the selected project
  // Only build if user and userMetadata are loaded to ensure metadata is available
  const builtProjectFiles =
    selectedProject !== null &&
    user !== null &&
    userMetadata !== null &&
    !isUserLoading
      ? buildProjectFilesForProject(selectedProject, schemaInfo)
      : [];
  const [isLoading, setIsLoading] = useState(false);
  // State for input value before being committed to store
  const [inputRepoURL, setInputRepoURL] = useState(publicRepoURL);
  // Use TanStack Query to fetch GitHub files
  const {
    isLoading: isUserFilesLoading,
    refetch: refetchUserFiles,
    data: userFiles,
    error: userFilesQueryError,
  } = useUserFiles(
    {
      publicRepoURL,
    },
    {
      refetchInterval: 5 * 60 * 1000, // 1 second
      staleTime: 5 * 60 * 1000, // 1 second
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Refetch on window focus — but only if stale
      enabled: !!publicRepoURL,
    },
  );
  // Handle GitHub data changes
  useEffect(() => {
    if (userFiles) {
      if (userFiles.length > 0) {
        // Just set the userFiles in the mock database store
        // The project store will handle detecting changes
        setUserFiles(userFiles);
      }
    }
  }, [userFiles, setUserFiles, publicRepoURL]);
  // Track schema changes
  useEffect(() => {
    // We don't need to rebuild files here - useTransformationsStore.setSchemaInfo already does this
    // The project files are automatically rebuilt when schema info changes
  }, [schemaInfo]);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'project') {
      const selectedProjectOption = projects.find((p) => p.name === value);
      if (selectedProjectOption) {
        if (selectedProject?.name !== selectedProjectOption.name) {
          selectProject(selectedProjectOption);
        }
      }
      return;
    }
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    const newFormData = {
      ...useFormStore.getState(),
      [name]: type === 'checkbox' ? checked : value,
    };
    useFormStore.setState(newFormData);
  };
  const { setIsSQLSchemaModalOpen, setSQLSchemaEditable } = useModalStore();
  // Sanitize GitHub URL by removing spaces and unnecessary characters
  const sanitizeGitHubURL = (url) => {
    // Remove all spaces
    return url.replace(/\s+/g, '').trim();
  };
  // Validate GitHub URL format
  const isValidGitHubURL = (url) => {
    return url === '' || url.startsWith('https://github.com/');
  };
  // Use our custom hook to debounce updates to the Zustand store
  const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);
  // Update the Zustand store when the debounced value changes
  useEffect(() => {
    // Only update the store if the value has actually changed
    setPublicRepoURL(inputRepoURL);
    if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
      // Trigger a refetch when the URL changes
      void refetchUserFiles();
    }
  }, [
    debouncedRepoURL,
    inputRepoURL,
    publicRepoURL,
    setPublicRepoURL,
    refetchUserFiles,
  ]);
  useEffect(() => {
    if (!typeMappings || Object.keys(typeMappings).length === 0) {
      return;
    }
    if (!dbTypes || dbTypes.length === 0) {
      return;
    }
    setTransformations();
  }, [
    dbType, // Don't remove! This changes the quote used in the database schema
    includeInsertData, // Don't remove! This toggles mock data generation
    includeTypeGuards, // Don't remove! This toggles type guards generation in the UI
    schemaInfo,
    typeMappings, // Don't remove! Transformations must wait for typeMappings to load
    dbTypes, // Don't remove! Transformations must wait for dbTypes to load
    setTransformations,
  ]);
  const stringInterfaces = consolidateInterfaces(interfaces);
  const [generationStatus, setGenerationStatus] = useState({
    isBackendUrlValid: true,
    isBackendDirValid: true,
    isFrontendDirValid: true,
    isDBConnectionValid: true,
  });
  // Add a new effect for initial app startup
  useEffect(() => {
    // Check if we need to initialize on startup
    // Trigger an immediate refetch when app starts if a URL is provided
    if (publicRepoURL) {
      // Force a refetch on every reload to detect remote changes
      void refetchUserFiles();
    }
  }, [publicRepoURL, refetchUserFiles]);
  return _jsxs('div', {
    className: 'text-white bg-black',
    children: [
      _jsxs('nav', {
        className:
          'bg-gray-900 text-white p-2 sticky top-0 z-50 text-center border-b border-gray-700',
        children: [
          _jsx('div', {
            className: 'absolute right-4 top-4 flex items-center gap-3',
            children: _jsx(UserProfile, {}),
          }),
          _jsx('div', {
            className: 'inline-block',
            children: _jsx('h1', {
              className: 'text-2xl font-bold inline-block pl-5 pr-5',
              children: 'Scaffolder - Write Once, Generate Forever!',
            }),
          }),
          _jsx('form', {
            id: 'appGeneratorForm',
            name: 'appGeneratorForm',
            children: _jsxs('div', {
              className: 'inline-block',
              children: [
                _jsxs('div', {
                  className: 'inline-block text-sm font-medium mr-2',
                  children: [
                    'Schema Templates:',
                    _jsx('div', {
                      className: 'flex items-center h-10',
                      children: _jsx('button', {
                        'data-testid': 'one-to-one-button',
                        type: 'button',
                        onClick: () => {
                          setMasterSchema();
                        },
                        className:
                          'sm:mb-0 sm:mr-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50',
                        children: 'Master Schema',
                      }),
                    }),
                  ],
                }),
                _jsxs('div', {
                  className: 'inline-block text-sm font-medium',
                  children: [
                    'Database Builder:',
                    _jsx('div', {
                      children: _jsx('select', {
                        id: 'creationMode',
                        name: 'creationMode',
                        value: creationMode,
                        onChange: (event) => {
                          const isValueInObject = (obj, value) => {
                            return Object.values(obj).includes(value);
                          };
                          const selected = event.target.value;
                          if (isValueInObject(CREATION_MODES, selected)) {
                            setCreationMode(selected);
                          }
                        },
                        className:
                          'text-center h-10 mr-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 border-2 rounded-md p-1 focus:outline-none',
                        children: Object.entries(CREATION_MODES).map(
                          ([key, value]) =>
                            _jsx(
                              'option',
                              { value: value, children: value },
                              key,
                            ),
                        ),
                      }),
                    }),
                  ],
                }),
                _jsxs('div', {
                  className: 'inline-block',
                  children: [
                    _jsxs('div', {
                      className: 'inline-block text-sm font-medium mr-2',
                      children: [
                        'Backend URL:',
                        !generationStatus.isBackendUrlValid &&
                          _jsx('i', {
                            className: 'block text-red-500',
                            children: '\u00A0Backend URL not available',
                          }),
                        _jsx('input', {
                          type: 'text',
                          id: 'backendUrl',
                          name: 'backendUrl',
                          value: backendUrl,
                          onChange: handleChange,
                          className: `h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                            generationStatus.isBackendUrlValid
                              ? 'border-gray-700 focus:border-indigo-500'
                              : 'border-red-500 focus:border-red-500'
                          }`,
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'inline-block text-sm font-medium mr-2',
                      children: [
                        'Backend Directory:',
                        !generationStatus.isBackendDirValid &&
                          _jsx('i', {
                            className: 'block text-red-500',
                            children: '\u00A0Invalid backend directory',
                          }),
                        _jsx('input', {
                          type: 'text',
                          id: 'backendDir',
                          name: 'backendDir',
                          value: backendDir,
                          onChange: handleChange,
                          className: `h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                            generationStatus.isBackendDirValid
                              ? 'border-gray-700 focus:border-indigo-500'
                              : 'border-red-500 focus:border-red-500'
                          }`,
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'inline-block text-sm font-medium mr-2',
                      children: [
                        'Frontend Directory:',
                        !generationStatus.isFrontendDirValid &&
                          _jsx('i', {
                            className: 'block text-red-500',
                            children: '\u00A0Invalid frontend directory',
                          }),
                        _jsx('input', {
                          type: 'text',
                          id: 'frontendDir',
                          name: 'frontendDir',
                          value: frontendDir,
                          onChange: handleChange,
                          className: `h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                            generationStatus.isFrontendDirValid
                              ? 'border-gray-700 focus:border-indigo-500'
                              : 'border-red-500 focus:border-red-500'
                          }`,
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'inline-block text-sm font-medium mr-2',
                      children: [
                        'Database Connection:',
                        !generationStatus.isDBConnectionValid &&
                          _jsx('i', {
                            className: 'block text-red-500',
                            children: '\u00A0Invalid connection string',
                          }),
                        _jsx('input', {
                          type: 'text',
                          id: 'dbConnection',
                          name: 'dbConnection',
                          value: dbConnection,
                          onChange: handleChange,
                          className: `h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                            generationStatus.isDBConnectionValid
                              ? 'border-gray-700 focus:border-indigo-500'
                              : 'border-red-500 focus:border-red-500'
                          }`,
                        }),
                      ],
                    }),
                    _jsx('div', {
                      className: 'inline-block',
                      children: _jsxs('div', {
                        className: 'inline-block text-sm font-medium mr-2',
                        children: [
                          'Database Type:',
                          _jsxs('div', {
                            className: 'flex items-center h-10',
                            children: [
                              _jsx('button', {
                                type: 'button',
                                onClick: () => {
                                  setDBType('postgresql');
                                },
                                className: `mr-2 sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
                                  dbType === 'postgresql'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-white'
                                }`,
                                children: 'PostgreSQL',
                              }),
                              _jsx('button', {
                                type: 'button',
                                onClick: () => {
                                  setDBType('mysql');
                                },
                                className: `sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
                                  dbType === 'mysql'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-white'
                                }`,
                                children: 'MySQL',
                              }),
                            ],
                          }),
                        ],
                      }),
                    }),
                  ],
                }),
              ],
            }),
          }),
          _jsxs('div', {
            className: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
            children: [
              _jsxs('button', {
                'data-testid': 'generate-app-button',
                type: 'button',
                onClick: () => {
                  setIsLoading(true);
                  fetch(`${getApiUrl()}/scaffold`, {
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      schemaInfo,
                      SQLSchema,
                      formData,
                    }),
                  })
                    .then((response) => response.json())
                    .then((result) => {
                      // Success
                      setGenerationStatus(result);
                    })
                    .catch((error) => {
                      // Failure
                      if (typeof error === `string`) {
                        throw Error(`There was an error: error`);
                      }
                      if (error instanceof Error) {
                        throw Error(`There was an error: ${error.message}`);
                      }
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                },
                className:
                  'mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                children: [
                  isLoading && 'Generating...',
                  !isLoading &&
                    _jsxs(_Fragment, {
                      children: [
                        'Create ',
                        _jsx('strong', {
                          children: selectedProject?.name ?? 'No',
                        }),
                        ' App',
                        _jsx('span', {
                          className: 'text-2xl',
                          children: '\uD83E\uDE84',
                        }),
                      ],
                    }),
                ],
              }),
              _jsxs('button', {
                type: 'button',
                onClick: () => {
                  fetch(`${getApiUrl()}/introspect`, {
                    // *GET, POST, PATCH, PUT, DELETE
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                    },
                    // For POST, PATCH, and PUT requests
                    body: JSON.stringify({ dbConnection, dbType }),
                  })
                    .then((response) => response.json())
                    .then((introspectedSchemaInfo) => {
                      const convertedSchemaInfo = convertIntrospectedStructure(
                        introspectedSchemaInfo,
                      );
                      // const mockData = generateMockData({
                      //   mockDataRows: 5,
                      //   schemaInfo,
                      // });
                      // const newFormData = {
                      //   ...useFormStore.getState(),
                      //   schemaInput: JSON.stringify(mockData, null, 4),
                      // };
                      // setFormData(newFormData);
                      setSchemaInfo(convertedSchemaInfo);
                      setGenerationStatus({
                        ...generationStatus,
                        isDBConnectionValid: true,
                      });
                    })
                    .catch((error) => {
                      /* prettier-ignore */ (() => { const QuickLog = error; const isObject = (obj) => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr) => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) {
                                            parentDiv.remove();
                                        } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj) => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = (arr) => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data) => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) {
                                            const table = createTableFromArray(data);
                                            newDiv.appendChild(table);
                                        }
                                        else if (isObject(data)) {
                                            const table = createTable(data);
                                            newDiv.appendChild(table);
                                        }
                                        else {
                                            newDiv.textContent = String(data);
                                        } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) {
                                            void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); });
                                        } }; const handleRightClick = (e) => { e.preventDefault(); if (parentDiv.contains(newDiv)) {
                                            parentDiv.removeChild(newDiv);
                                            if (!parentDiv.hasChildNodes()) {
                                                parentDiv.remove();
                                            }
                                        } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv(QuickLog)); })();
                      // Failure
                      setGenerationStatus({
                        ...generationStatus,
                        isDBConnectionValid: false,
                      });
                    });
                },
                className:
                  'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                children: [
                  _jsx('strong', { children: 'Introspector' }),
                  ' - Generate Code From Existing Database',
                  _jsx('br', {}),
                  _jsx('i', { className: 'text-xs', children: dbConnection }),
                ],
              }),
              process.env.NODE_ENV === 'development' &&
                _jsxs(_Fragment, {
                  children: [
                    _jsx('button', {
                      title: JSON.stringify(
                        schemaInfo.map(
                          ({
                            requiredColumns: _1,
                            columnsInfo: _2,
                            foreignKeys: _3,
                            ...newObject
                          }) => newObject,
                        ),
                        null,
                        4,
                      ),
                      onClick: (e) => {
                        e.preventDefault();
                        handleCopy(
                          JSON.stringify(
                            schemaInfo.map(
                              ({
                                requiredColumns: _1,
                                columnsInfo: _2,
                                foreignKeys: _3,
                                ...newObject
                              }) => newObject,
                            ),
                            null,
                            4,
                          ),
                        );
                      },
                      className:
                        'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                      children: 'Copy Schema Info',
                    }),
                    _jsx('button', {
                      title: JSON.stringify(schemaInfo, null, 4),
                      onClick: (e) => {
                        e.preventDefault();
                        handleCopy(JSON.stringify(schemaInfo, null, 4));
                      },
                      className:
                        'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                      children: 'Copy Schema Info with Columns',
                    }),
                  ],
                }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'p-4',
        children: [
          _jsxs('div', {
            className: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
            children: [
              _jsxs('div', {
                className: 'bg-gray-700 p-4 shadow-md rounded-md',
                children: [
                  creationMode === CREATION_MODES.SCHEMA_BUILDER &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsx('h2', {
                          className: 'text-xl font-bold mb-2',
                          children: 'Schema Builder',
                        }),
                        _jsx(SchemaBuilder, {}),
                      ],
                    }),
                  creationMode === CREATION_MODES.JSON_SCHEMA &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsx('h2', {
                          className: 'text-xl font-bold mb-2',
                          children: 'JSON Database Schema',
                        }),
                        _jsx(JSONSchemaEditor, {}),
                      ],
                    }),
                ],
              }),
              _jsxs('div', {
                className: 'bg-gray-800 p-4 shadow-md rounded-md',
                children: [
                  _jsx('h2', {
                    className: 'text-xl font-bold mb-2',
                    children: 'Generated Code',
                  }),
                  _jsxs('div', {
                    className: 'block text-sm font-medium',
                    children: [
                      'Public GitHub Repository URL:',
                      _jsx('input', {
                        id: 'publicRepoURL',
                        name: 'publicRepoURL',
                        type: 'text',
                        placeholder:
                          'Public repository URL: e.g., https://github.com/user/scaffolder-files',
                        value: inputRepoURL,
                        onChange: (e) => {
                          const sanitizedValue = sanitizeGitHubURL(
                            e.target.value,
                          );
                          setInputRepoURL(sanitizedValue);
                        },
                        className: `mb-2 p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                          !isValidGitHubURL(inputRepoURL) && inputRepoURL !== ''
                            ? 'border-red-500'
                            : 'border-gray-700'
                        }`,
                        onKeyDown: (e) => {
                          if (inputRepoURL && e.key === 'Enter') {
                            e.preventDefault();
                            // Re-fetch when the user presses Enter
                            void refetchUserFiles();
                          }
                        },
                      }),
                      !isValidGitHubURL(inputRepoURL) &&
                        inputRepoURL !== '' &&
                        _jsx('div', {
                          className: 'text-red-500 text-xs mt-1',
                          children: 'URL must start with https://github.com/',
                        }),
                    ],
                  }),
                  !inputRepoURL &&
                    _jsx('div', {
                      className:
                        'flex items-center text-gray-500 justify-center h-40 rounded-md',
                      children:
                        'Please enter a GitHub repository URL to generate code',
                    }),
                  inputRepoURL &&
                    isValidGitHubURL(inputRepoURL) &&
                    _jsx('div', {
                      children: (() => {
                        if (isUserFilesLoading) {
                          return _jsx('div', {
                            className:
                              'flex items-center justify-center h-40 rounded-md',
                            children: _jsxs('div', {
                              className: 'text-white',
                              children: [
                                _jsxs('svg', {
                                  className:
                                    'animate-spin -ml-1 mr-3 h-10 w-10 text-white inline-block',
                                  xmlns: 'http://www.w3.org/2000/svg',
                                  fill: 'none',
                                  viewBox: '0 0 24 24',
                                  children: [
                                    _jsx('circle', {
                                      className: 'opacity-25',
                                      cx: '12',
                                      cy: '12',
                                      r: '10',
                                      stroke: 'currentColor',
                                      strokeWidth: '4',
                                    }),
                                    _jsx('path', {
                                      className: 'opacity-75',
                                      fill: 'currentColor',
                                      d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                                    }),
                                  ],
                                }),
                                'Loading repository files...',
                              ],
                            }),
                          });
                        }
                        if (userFilesQueryError) {
                          return _jsx('div', {
                            className:
                              'flex items-center justify-center h-40 rounded-md',
                            children: _jsxs('div', {
                              className: 'text-red-500 text-center p-4',
                              children: [
                                _jsx('svg', {
                                  xmlns: 'http://www.w3.org/2000/svg',
                                  className:
                                    'h-10 w-10 text-red-500 inline-block mb-2',
                                  fill: 'none',
                                  viewBox: '0 0 24 24',
                                  stroke: 'currentColor',
                                  children: _jsx('path', {
                                    strokeLinecap: 'round',
                                    strokeLinejoin: 'round',
                                    strokeWidth: 2,
                                    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                                  }),
                                }),
                                _jsx('div', {
                                  className: 'font-bold mb-2',
                                  children: 'Error Loading Repository Files',
                                }),
                                _jsx('div', {
                                  children: userFilesQueryError.message,
                                }),
                              ],
                            }),
                          });
                        }
                        if (selectedProject !== null) {
                          return _jsxs(_Fragment, {
                            children: [
                              process.env.NODE_ENV === 'development' &&
                                _jsxs(_Fragment, {
                                  children: [
                                    _jsxs('div', {
                                      children: [
                                        _jsx('button', {
                                          type: 'button',
                                          className:
                                            'bg-gray-500 text-white px-2 py-1 rounded-md',
                                          onClick: () => {
                                            invalidateProjectCache(
                                              selectedProject.name,
                                            );
                                          },
                                          children: 'Clear Project Cache',
                                        }),
                                        _jsx('br', {}),
                                        _jsxs('code', {
                                          children: [
                                            'Cached projects:',
                                            JSON.stringify(
                                              Object.keys(projectBuildCache),
                                              null,
                                              4,
                                            ),
                                          ],
                                        }),
                                      ],
                                    }),
                                    _jsx('br', {}),
                                    _jsxs('code', {
                                      children: [
                                        'Selected project:',
                                        _jsx('br', {}),
                                        selectedProject.name,
                                        _jsx('br', {}),
                                        selectedProject.content.substring(
                                          0,
                                          20,
                                        ),
                                        '...',
                                        _jsx('br', {}),
                                        _jsx('br', {}),
                                      ],
                                    }),
                                  ],
                                }),
                              _jsx('label', {
                                htmlFor: 'project',
                                children: 'Project:',
                              }),
                              _jsx('select', {
                                id: 'project',
                                name: 'project',
                                value: selectedProject.name,
                                onChange: handleChange,
                                className:
                                  'p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                                children: projects.map((project) =>
                                  _jsx(
                                    'option',
                                    {
                                      value: project.name,
                                      children: project.name,
                                    },
                                    project.name,
                                  ),
                                ),
                              }),
                              _jsx(FileViewer, {
                                mode: 'edit',
                                folderStructure: builtProjectFiles,
                                projectName: selectedProject.name,
                              }),
                              _jsx(FileViewer, {
                                mode: 'edit',
                                folderStructure: folderStructures.Laravel,
                              }),
                            ],
                          });
                        }
                      })(),
                    }),
                ],
              }),
            ],
          }),
          _jsx('br', {}),
          _jsxs('div', {
            className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4',
            children: [
              _jsxs('div', {
                className: 'bg-gray-800 p-4 shadow-md rounded-md',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('h2', {
                        className: 'text-xl font-bold mb-2',
                        children: 'Create Tables',
                      }),
                      _jsx('textarea', {
                        id: 'SQLSchema',
                        title: 'Double click to edit schema',
                        value: SQLSchema,
                        readOnly: true,
                        onDoubleClick: () => {
                          setSQLSchemaEditable(SQLSchema);
                          setIsSQLSchemaModalOpen(true);
                        },
                        rows: 15,
                        className:
                          'cursor-pointer p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                      }),
                      _jsxs('div', {
                        className: 'block text-sm font-medium mt-4',
                        children: [
                          _jsx('input', {
                            'data-testid': 'include-insert-data-checkbox',
                            type: 'checkbox',
                            id: 'includeInsertData',
                            name: 'includeInsertData',
                            checked: includeInsertData,
                            onChange: handleChange,
                            className: 'mr-2',
                          }),
                          'Include Insert Data',
                        ],
                      }),
                      includeInsertData &&
                        _jsxs('div', {
                          className: 'mt-2',
                          children: [
                            creationMode === CREATION_MODES.JSON_SCHEMA &&
                              _jsxs('div', {
                                className: 'block text-sm font-medium',
                                children: [
                                  _jsx('input', {
                                    type: 'radio',
                                    name: 'insertOption',
                                    value: 'SQLInsertQueries',
                                    checked:
                                      insertOption === 'SQLInsertQueries',
                                    onChange: handleChange,
                                    className: 'mr-2',
                                  }),
                                  'Rows from JSON Database Schema',
                                ],
                              }),
                            _jsxs('div', {
                              className: 'block text-sm font-medium',
                              children: [
                                _jsx('input', {
                                  type: 'radio',
                                  name: 'insertOption',
                                  value: 'SQLInsertQueriesFromMockData',
                                  checked:
                                    insertOption ===
                                    'SQLInsertQueriesFromMockData',
                                  onChange: handleChange,
                                  className: 'mr-2',
                                }),
                                'Rows from mock data',
                              ],
                            }),
                          ],
                        }),
                      _jsx('button', {
                        onClick: () => {
                          handleCopy(SQLSchema);
                        },
                        className:
                          'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                        children: 'Copy Database Schema',
                      }),
                      _jsx('br', {}),
                      _jsx('br', {}),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('h2', {
                        className: 'text-xl font-bold mb-2',
                        children: 'Delete Tables',
                      }),
                      _jsx('div', {
                        className:
                          'block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2',
                        children: deleteTablesQueries.map((value, i) =>
                          _jsx(
                            'p',
                            {
                              className: 'whitespace-pre-wrap',
                              children: value,
                            },
                            i,
                          ),
                        ),
                      }),
                      _jsx('button', {
                        onClick: () => {
                          handleCopy(deleteTablesQueries.join('\n'));
                        },
                        className:
                          'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                        children: 'Copy Delete Queries',
                      }),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'bg-gray-800 p-4 shadow-md rounded-md',
                children: [
                  _jsx('h2', {
                    className: 'text-xl font-bold mb-2',
                    children: 'Mock Data',
                  }),
                  _jsx('textarea', {
                    id: 'mockData',
                    value: JSON.stringify(mockData, null, 2),
                    readOnly: true,
                    rows: 10,
                    className:
                      'p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                  }),
                  _jsx('button', {
                    onClick: () => {
                      handleCopy(JSON.stringify(mockData, null, 2));
                    },
                    className:
                      'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                    children: 'Copy Mock Data',
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'bg-gray-800 p-4 shadow-md rounded-md',
                children: [
                  directJoins.length > 0 &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsx('h2', {
                          className: 'text-xl font-bold mb-2',
                          children: 'Direct Join Queries',
                        }),
                        _jsx('div', {
                          className:
                            'block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2',
                          children: directJoins.map((value, i) =>
                            _jsxs(
                              'div',
                              {
                                children: [
                                  _jsx('p', {
                                    className: 'whitespace-pre-wrap',
                                    children: value,
                                  }),
                                  _jsx('br', {}),
                                ],
                              },
                              i,
                            ),
                          ),
                        }),
                        _jsx('button', {
                          onClick: () => {
                            handleCopy(directJoins.join('\n'));
                          },
                          className:
                            'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                          children: 'Copy Join Queries',
                        }),
                        _jsx('br', {}),
                        _jsx('br', {}),
                      ],
                    }),
                  oneToOneJoins.length > 0 &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsx('h2', {
                          className: 'text-xl font-bold mb-2',
                          children: 'One-to-One Join Queries (One-to-One)',
                        }),
                        _jsx('div', {
                          className:
                            'block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2',
                          children: oneToOneJoins.map((value, i) =>
                            _jsxs(
                              'div',
                              {
                                children: [
                                  _jsx('p', {
                                    className: 'whitespace-pre-wrap',
                                    children: value,
                                  }),
                                  _jsx('br', {}),
                                ],
                              },
                              i,
                            ),
                          ),
                        }),
                        _jsx('button', {
                          onClick: () => {
                            handleCopy(oneToOneJoins.join('\n'));
                          },
                          className:
                            'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                          children: 'Copy Join Queries',
                        }),
                        _jsx('br', {}),
                        _jsx('br', {}),
                      ],
                    }),
                  aggregateJoins.length > 0 &&
                    _jsxs(_Fragment, {
                      children: [
                        _jsx('h2', {
                          className: 'text-xl font-bold mb-2',
                          children:
                            'Aggregate Join Queries (One-to-Many and Many-to-Many)',
                        }),
                        _jsx('div', {
                          className:
                            'block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2',
                          children: aggregateJoins.map((value, i) =>
                            _jsxs(
                              'div',
                              {
                                children: [
                                  _jsx('p', {
                                    className: 'whitespace-pre-wrap',
                                    children: value,
                                  }),
                                  _jsx('br', {}),
                                ],
                              },
                              i,
                            ),
                          ),
                        }),
                        _jsx('button', {
                          onClick: () => {
                            handleCopy(aggregateJoins.join('\n'));
                          },
                          className:
                            'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                          children: 'Copy Join Queries',
                        }),
                      ],
                    }),
                ],
              }),
              _jsxs('div', {
                className: 'bg-gray-800 p-4 shadow-md rounded-md',
                children: [
                  _jsxs('div', {
                    className: 'float-right',
                    children: [
                      _jsxs('div', {
                        className: 'block text-sm font-medium mt-4',
                        children: [
                          _jsx('input', {
                            type: 'checkbox',
                            id: 'includeTypeGuards',
                            name: 'includeTypeGuards',
                            checked: includeTypeGuards,
                            onChange: handleChange,
                            className: 'mr-2',
                          }),
                          'Include Type Guards',
                        ],
                      }),
                      _jsxs('div', {
                        className: 'block text-sm font-medium mt-4',
                        children: [
                          _jsx('input', {
                            type: 'checkbox',
                            id: 'outputOnSingleFile',
                            name: 'outputOnSingleFile',
                            checked: outputOnSingleFile,
                            onChange: handleChange,
                            className: 'mr-2',
                          }),
                          'Output on a Single File',
                        ],
                      }),
                    ],
                  }),
                  _jsx('br', {}),
                  _jsx('h2', {
                    className: 'text-xl font-bold mb-2',
                    children: 'TypeScript Interfaces',
                  }),
                  _jsx('br', {}),
                  _jsx('div', {
                    className: '',
                    children: outputOnSingleFile
                      ? _jsxs(_Fragment, {
                          children: [
                            _jsx('h3', {
                              className:
                                'text-base font-semibold text-white mb-2',
                              children: 'interfaces.ts',
                            }),
                            _jsx('textarea', {
                              id: 'interfaces',
                              value: stringInterfaces,
                              readOnly: true,
                              rows: 10,
                              className:
                                'p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                            }),
                          ],
                        })
                      : _jsx('div', {
                          className: 'max-h-96 overflow-y-auto',
                          children: Object.entries(interfaces).map(
                            ([interfaceName, content]) =>
                              _jsxs(
                                'div',
                                {
                                  className: 'mb-4',
                                  children: [
                                    _jsxs('h3', {
                                      className:
                                        'text-base font-semibold text-white mb-2',
                                      children: [interfaceName, '.ts'],
                                    }),
                                    _jsx('textarea', {
                                      id: `interface-${interfaceName}`,
                                      name: `interface-${interfaceName}`,
                                      value: content,
                                      readOnly: true,
                                      rows: 10,
                                      className:
                                        'h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                                    }),
                                    _jsxs('button', {
                                      onClick: () => {
                                        handleCopy(content);
                                      },
                                      className:
                                        'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                                      children: ['Copy ', interfaceName],
                                    }),
                                  ],
                                },
                                interfaceName,
                              ),
                          ),
                        }),
                  }),
                  _jsx('button', {
                    onClick: () => {
                      handleCopy(stringInterfaces);
                    },
                    className:
                      'mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                    children: 'Copy All Interfaces',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
export default App;
