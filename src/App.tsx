import { useState, useEffect } from 'react';
import { frameworks, useFormStore } from '@/useFormStore.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';

import { useModalStore } from '@/useModalStore.ts';

import { consolidateInterfaces } from '@/utils/common.ts';
import FileViewer from '@/components/FileViewer.tsx';
import AdditionalSchemaSettings from '@/components/AdditionalSchemaSettings.tsx';
import { handleCopy } from '@/helpers/stringHelper.ts';
import { useFolderStructures } from '@/frameworks/useFolderStructures.ts';
import SchemaBuilder from '@/components/SchemaBuilder.tsx';
import { CREATION_MODES } from '@/constants.ts';
import { ISchemaInfo, isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import JSONSchemaEditor from '@/components/JSONSchemaEditor/JSONSchemaEditor.tsx';

function App() {
  const {
    dbType,
    setOneToOne,
    setOneToMany,
    setManyToMany,
    setDBType,
    formData,
    creationMode,
    setCreationMode,
    setFormData,
  } = useFormStore();

  const {
    backendUrl,
    backendDir,
    frontendDir,
    dbConnection,
    framework,
    includeInsertData,
    insertOption,
    includeTypeGuards,
    outputOnSingleFile,
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

  useEffect(() => {
    setTransformations();
  }, [schemaInfo, setTransformations]);

  const stringInterfaces = consolidateInterfaces(interfaces);

  const [generationStatus, setGenerationStatus] = useState<{
    isBackendUrlValid: boolean;
    isBackendDirValid: boolean;
    isFrontendDirValid: boolean;
    isDBConnectionValid: boolean;
  }>({
    isBackendUrlValid: true,
    isBackendDirValid: true,
    isFrontendDirValid: true,
    isDBConnectionValid: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    const newFormData = {
      ...useFormStore.getState().formData,
      [name]: type === 'checkbox' ? checked : value,
    };
    setFormData(newFormData);
  };

  const { setIsSQLSchemaModalOpen, setSQLSchemaEditable } = useModalStore();

  return (
    <div className="text-white bg-black">
      <nav className="bg-gray-900 text-white p-2 sticky top-0 z-50 text-center">
        <div className="inline-block">
          <h1 className="text-2xl font-bold inline-block pl-5 pr-5">
            App Generator
          </h1>
        </div>
        <form id="appGeneratorForm" name="appGeneratorForm">
          <div className="inline-block">
            <div className="inline-block text-sm font-medium mr-2">
              Schema Templates:
              <div className="flex items-center h-10">
                <button
                  data-testid="one-to-one-button"
                  type="button"
                  onClick={() => {
                    setOneToOne();
                  }}
                  className="sm:mb-0 sm:mr-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                >
                  One to One
                </button>
                <button
                  data-testid="one-to-many-button"
                  type="button"
                  onClick={() => {
                    setOneToMany();
                  }}
                  className="sm:mb-0 sm:mr-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                >
                  One to Many
                </button>
                <button
                  data-testid="many-to-many-button"
                  type="button"
                  onClick={() => {
                    setManyToMany();
                  }}
                  className="sm:mb-0 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Many to Many
                </button>
              </div>
            </div>
            <div className="inline-block text-sm font-medium">
              Database Builder:
              <div>
                <select
                  id="creationMode"
                  name="creationMode"
                  value={creationMode}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                    const isValueInObject = <T extends object>(
                      obj: T,
                      value: unknown,
                    ): value is T[keyof T] => {
                      return Object.values(obj).includes(value);
                    };

                    const selected = event.target.value;
                    if (isValueInObject(CREATION_MODES, selected)) {
                      setCreationMode(selected);
                    }
                  }}
                  className="h-10 mr-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 border-2 rounded-md p-1 focus:outline-none"
                >
                  {Object.entries(CREATION_MODES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="inline-block">
              <div className="inline-block text-sm font-medium mr-2">
                Backend URL:
                {!generationStatus.isBackendUrlValid && (
                  <i className="block text-red-500">
                    &nbsp;Invalid backend URL
                  </i>
                )}
                <input
                  type="text"
                  id="backendUrl"
                  name="backendUrl"
                  value={backendUrl}
                  onChange={handleChange}
                  className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isBackendUrlValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </div>
              <div className="inline-block text-sm font-medium mr-2">
                Backend Directory:
                {!generationStatus.isBackendDirValid && (
                  <i className="block text-red-500">
                    &nbsp;Invalid backend directory
                  </i>
                )}
                <input
                  type="text"
                  id="backendDir"
                  name="backendDir"
                  value={backendDir}
                  onChange={handleChange}
                  className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isBackendDirValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </div>
              <div className="inline-block text-sm font-medium mr-2">
                Frontend Directory:
                {!generationStatus.isFrontendDirValid && (
                  <i className="block text-red-500">
                    &nbsp;Invalid frontend directory
                  </i>
                )}
                <input
                  type="text"
                  id="frontendDir"
                  name="frontendDir"
                  value={frontendDir}
                  onChange={handleChange}
                  className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isFrontendDirValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </div>
              <div className="inline-block text-sm font-medium mr-2">
                Database Connection:
                {!generationStatus.isDBConnectionValid && (
                  <i className="block text-red-500">
                    &nbsp;Invalid connection string
                  </i>
                )}
                <input
                  type="text"
                  id="dbConnection"
                  name="dbConnection"
                  value={dbConnection}
                  onChange={handleChange}
                  className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isDBConnectionValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </div>
              <div className="inline-block">
                <div className="inline-block text-sm font-medium mr-2">
                  Database Type:
                  <div className="flex items-center h-10">
                    <button
                      type="button"
                      onClick={() => {
                        setDBType('postgresql');
                      }}
                      className={`mr-2 sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
                        dbType === 'postgresql'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      PostgreSQL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDBType('mysql');
                      }}
                      className={`sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
                        dbType === 'mysql'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      MySQL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            data-testid="generate-app-button"
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetch(`http://localhost:5000/scaffold`, {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  schemaInfo,
                  backendDir,
                  frontendDir,
                  dbConnection,
                  framework,
                  SQLSchema,
                  backendUrl,
                }),
              })
                .then((response) => response.json())
                .then((result: typeof generationStatus) => {
                  // Success
                  setGenerationStatus(result);
                })
                .catch((error: unknown) => {
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
            }}
            className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
          >
            {isLoading && 'Generating...'}
            {!isLoading && (
              <>
                Create <strong>{framework}</strong> App
                <span className="text-2xl">🪄</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              fetch(`http://localhost:5000/introspect`, {
                // *GET, POST, PATCH, PUT, DELETE
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                // For POST, PATCH, and PUT requests
                body: JSON.stringify({ dbConnection }),
              })
                .then((response) => response.json())
                .then((schemaInfo: ISchemaInfo[]) => {
                  if (isISchemaInfoArray(schemaInfo)) {
                    // const mockData = generateMockData({
                    //   mockDataRows: 5,
                    //   schemaInfo,
                    // });
                    // const newFormData = {
                    //   ...useFormStore.getState().formData,
                    //   schemaInput: JSON.stringify(mockData, null, 4),
                    // };
                    // setFormData(newFormData);

                    setSchemaInfo(schemaInfo);

                    setGenerationStatus({
                      ...generationStatus,
                      ...{
                        isDBConnectionValid: true,
                      },
                    });
                  }
                })
                .catch((error: unknown) => {
                  /* prettier-ignore */ (() => { const QuickLog = error; const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv(QuickLog)); })();
                  // Failure
                  setGenerationStatus({
                    ...generationStatus,
                    ...{
                      isDBConnectionValid: false,
                    },
                  });
                });
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
          >
            <strong>Introspector</strong> - Generate Code From Existing Database
            <br />
            <i className="text-xs">{dbConnection}</i>
          </button>

          <button
            title={JSON.stringify(
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
            )}
            onClick={(e) => {
              e.preventDefault();

              /* prettier-ignore */ handleCopy(JSON.stringify(schemaInfo.map( ({ requiredColumns: _1, columnsInfo: _2, foreignKeys: _3, ...newObject }) => newObject, ), null, 4));
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Copy Schema Info
          </button>

          <button
            title={JSON.stringify(schemaInfo, null, 4)}
            onClick={(e) => {
              e.preventDefault();
              handleCopy(JSON.stringify(schemaInfo, null, 4));
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Copy Schema Info with Columns
          </button>
        </div>
      </nav>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-700 p-4 shadow-md rounded-md">
            {creationMode === CREATION_MODES.SCHEMA_BUILDER && (
              <>
                <h2 className="text-xl font-bold mb-2">Schema Builder</h2>
                <SchemaBuilder />
              </>
            )}
            {/* @ts-expect-error: JSONSchemaEditor is temporarily disabled */}
            {creationMode === CREATION_MODES.JSON_SCHEMA && (
              <>
                <h2 className="text-xl font-bold mb-2">JSON Database Schema</h2>
                <JSONSchemaEditor />
              </>
            )}
            <div>
              <div className="block text-sm font-medium">
                Additional Schema Settings:
                <AdditionalSchemaSettings />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Generated Code</h2>
            <div className="block text-sm font-medium">
              Framework:
              <select
                id="framework"
                name="framework"
                value={framework}
                onChange={handleChange}
                className="p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {/* <option value={''}>Select a framework</option> */}
                {Object.entries(frameworks).map(
                  ([key, value]: [string, string]) => (
                    <option key={key} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="grid grid-rows-2 h-screen gap-4">
              {/* <div className="bg-blue-500  text-white font-bold">
                <FileViewer
                  folderColor={'yellow'}
                  folderStructure={useFolderStructures(schemaInfo)[framework]}
                />
              </div>
              <div className="bg-green-500 flex text-white font-bold">
                <FileViewer
                  folderColor={'green'}
                  folderStructure={useFolderStructures(schemaInfo).frontend}
                />
              </div> */}

              <FileViewer
                folderColor={'yellow'}
                folderStructure={useFolderStructures(schemaInfo)[framework]}
              />
              <FileViewer
                folderColor={'green'}
                folderStructure={useFolderStructures(schemaInfo).frontend}
              />
            </div>
          </div>
        </div>
        <br />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <div>
              <h2 className="text-xl font-bold mb-2">Create Tables</h2>
              <textarea
                id="SQLSchema"
                title="Double click to edit schema"
                value={SQLSchema}
                readOnly
                onDoubleClick={() => {
                  setSQLSchemaEditable(SQLSchema);
                  setIsSQLSchemaModalOpen(true);
                }}
                rows={15}
                className="cursor-pointer p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              />
              <div className="block text-sm font-medium mt-4">
                <input
                  data-testid="include-insert-data-checkbox"
                  type="checkbox"
                  id="includeInsertData"
                  name="includeInsertData"
                  checked={includeInsertData}
                  onChange={handleChange}
                  className="mr-2"
                />
                Include Insert Data
              </div>
              {includeInsertData && (
                <div className="mt-2">
                  <div className="block text-sm font-medium">
                    <input
                      type="radio"
                      name="insertOption"
                      value="SQLInsertQueries"
                      checked={insertOption === 'SQLInsertQueries'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Rows from JSON Database Schema
                  </div>
                  <div className="block text-sm font-medium">
                    <input
                      type="radio"
                      name="insertOption"
                      value="SQLInsertQueriesFromMockData"
                      checked={insertOption === 'SQLInsertQueriesFromMockData'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Rows from mock data
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  handleCopy(SQLSchema);
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Copy Database Schema
              </button>
              <br />
              <br />
              {/* {schemaInput !== '' && dbConnection !== '' && (
              <>
                <br />
                <button
                  onClick={() => {
                    handleCopy(SQLSchema);
                  }}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Execute Query
                </button>
              </>
            )} */}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Delete Tables</h2>
              <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
                {deleteTablesQueries.map((value, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {value}
                  </p>
                ))}
              </div>
              <button
                onClick={() => {
                  handleCopy(deleteTablesQueries.join('\n'));
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Copy Delete Queries
              </button>
            </div>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Mock Data</h2>
            <textarea
              id="mockData"
              value={JSON.stringify(mockData, null, 2)}
              readOnly
              rows={10}
              className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
            <button
              onClick={() => {
                handleCopy(JSON.stringify(mockData, null, 2));
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Mock Data
            </button>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            {directJoins.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-2">Direct Join Queries</h2>
                <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
                  {directJoins.map((value, i) => (
                    <div key={i}>
                      <p className="whitespace-pre-wrap">{value}</p>
                      <br />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    handleCopy(directJoins.join('\n'));
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Copy Join Queries
                </button>
                <br />
                <br />
              </>
            )}
            {oneToOneJoins.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-2">
                  One-to-One Join Queries (One-to-One)
                </h2>
                <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
                  {oneToOneJoins.map((value, i) => (
                    <div key={i}>
                      <p className="whitespace-pre-wrap">{value}</p>
                      <br />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    handleCopy(oneToOneJoins.join('\n'));
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Copy Join Queries
                </button>
                <br />
                <br />
              </>
            )}
            {aggregateJoins.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-2">
                  Aggregate Join Queries (One-to-Many and Many-to-Many)
                </h2>
                <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
                  {aggregateJoins.map((value, i) => (
                    <div key={i}>
                      <p className="whitespace-pre-wrap">{value}</p>
                      <br />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    handleCopy(aggregateJoins.join('\n'));
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Copy Join Queries
                </button>
              </>
            )}
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <div className="float-right">
              <div className="block text-sm font-medium mt-4">
                <input
                  type="checkbox"
                  id="includeTypeGuards"
                  name="includeTypeGuards"
                  checked={includeTypeGuards}
                  onChange={handleChange}
                  className="mr-2"
                />
                Include Type Guards
              </div>
              <div className="block text-sm font-medium mt-4">
                <input
                  type="checkbox"
                  id="outputOnSingleFile"
                  name="outputOnSingleFile"
                  checked={outputOnSingleFile}
                  onChange={handleChange}
                  className="mr-2"
                />
                Output on a Single File
              </div>
            </div>
            <br />
            <h2 className="text-xl font-bold mb-2">TypeScript Interfaces</h2>
            <br />
            <div className="">
              {outputOnSingleFile ? (
                <>
                  <h3 className="text-base font-semibold text-white mb-2">
                    interfaces.ts
                  </h3>
                  <textarea
                    id="interfaces"
                    value={stringInterfaces}
                    readOnly
                    rows={10}
                    className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                  />
                </>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(interfaces).map(
                    ([interfaceName, content]) => (
                      <div key={interfaceName} className="mb-4">
                        <h3 className="text-base font-semibold text-white mb-2">
                          {interfaceName}.ts
                        </h3>
                        <textarea
                          id={`interface-${interfaceName}`}
                          name={`interface-${interfaceName}`}
                          value={content}
                          readOnly
                          rows={10}
                          className="h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                        />
                        <button
                          onClick={() => {
                            handleCopy(content);
                          }}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                        >
                          Copy {interfaceName}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                handleCopy(stringInterfaces);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy All Interfaces
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
