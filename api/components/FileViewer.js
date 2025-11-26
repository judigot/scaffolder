import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  CreateNewFolder as CreateNewFolderIcon,
  NoteAdd as NoteAddIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { handleCopy } from '../helpers/stringHelper';
import Editor from '@monaco-editor/react';
import { useModalStore } from '../components/Modal/base/modalStore';
import ContextMenu from '../components/UI/ContextMenu';
import zipAndDownloadIStructure from '../utils/zipIStructure';
import { useFormStore } from '../useFormStore';
import useTransformationsStore from '../useTransformationsStore';
import { useProjectStore } from '../useProjectStore';
import { useMockDatabaseStore } from '../useMockDatabaseStore';
import { getApiUrl } from '../utils/getApiUrl';
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svg',
]);
const isImageFile = (filename) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};
const createUniqueFileId = (path, fileName) => {
  return [...path, fileName].join('/');
};
function FileViewer({
  folderStructure: initialFolderStructure,
  mode,
  projectName,
}) {
  const { getAccessTokenSilently } = useAuth0();
  const { schemaInfo, SQLSchema } = useTransformationsStore();
  const { backendDir, publicRepoURL, dbConnection } = useFormStore();
  const { editValue, newValue, promptModal, openRandomModal } = useModalStore();
  const { selectedProject } = useProjectStore();
  const { userFiles } = useMockDatabaseStore();
  const [folderStructure, setFolderStructure] = useState(
    initialFolderStructure,
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isFileEdited, setIsFileEdited] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const editorRef = useRef(null);
  const fileViewerRef = useRef(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingRepository, setIsCreatingRepository] = useState(false);
  // Save file content changes - wrapped in useCallback
  const saveFileChanges = useCallback(() => {
    if (!selectedFile || !editorRef.current) {
      return;
    }
    const newContent = editorRef.current.getValue();
    const updateFileInStructure = (items, path, fileName, newContent) => {
      if (path.length === 0) {
        return items.map((item) => {
          if (item.type === 'file' && item.name === fileName) {
            return { ...item, content: newContent };
          }
          return item;
        });
      }
      const currentFolder = path[0];
      const remainingPath = path.slice(1);
      return items.map((item) => {
        if (item.type === 'folder' && item.name === currentFolder) {
          return {
            ...item,
            children: updateFileInStructure(
              item.children,
              remainingPath,
              fileName,
              newContent,
            ),
          };
        }
        return item;
      });
    };
    const updatedStructure = updateFileInStructure(
      folderStructure,
      currentPath,
      selectedFile.name,
      newContent,
    );
    setFolderStructure(updatedStructure);
    setFileContent(newContent);
    setIsFileEdited(false); // Mark as saved
  }, [
    selectedFile,
    editorRef,
    folderStructure,
    currentPath,
    setFolderStructure,
  ]);
  // Restore the missing useEffect that syncs folderStructure with initialFolderStructure
  useEffect(() => {
    setFolderStructure(initialFolderStructure);
  }, [initialFolderStructure]);
  // Update fileContent when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content);
      setIsFileEdited(false); // Reset edit state when changing files
    }
  }, [selectedFile]);
  // Modified effect to find file by uniqueId instead of just name
  useEffect(() => {
    if (selectedFile) {
      const findFileByUniqueId = (items, path = []) => {
        for (const item of items) {
          if (item.type === 'file') {
            const itemUniqueId = createUniqueFileId(path, item.name);
            if (itemUniqueId === selectedFile.uniqueId) {
              return { file: item, path };
            }
          } else {
            const found = findFileByUniqueId(item.children, [
              ...path,
              item.name,
            ]);
            if (found.file) {
              return found;
            }
          }
        }
        return { file: null, path: [] };
      };
      const { file, path } = findFileByUniqueId(folderStructure);
      if (file) {
        // Create a file with uniqueId
        const fileWithUniqueId = {
          ...file,
          uniqueId: createUniqueFileId(path, file.name),
        };
        setSelectedFile(fileWithUniqueId);
        setCurrentPath(path);
      } else {
        setSelectedFile(null);
        setCurrentPath([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderStructure, selectedFile?.uniqueId]);
  // Add keyboard event listener for shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if the editor has focus or fileViewer is in the document
      if (!fileViewerRef.current || !selectedFile || !editorRef.current) {
        return;
      }
      // Save on Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's save dialog
        saveFileChanges();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFile, saveFileChanges]);
  // Handle editor mount with proper type
  const handleEditorDidMount = (editor) => {
    // Store the editor with our interface that only exposes what we need
    editorRef.current = {
      getValue: () => editor.getValue(),
    };
  };
  // Handle closing a file with confirmation if unsaved
  const handleCloseFile = async () => {
    if (!selectedFile) {
      return;
    }
    if (isFileEdited) {
      // Get user's decision about saving changes
      const result = await promptModal({
        title: 'Unsaved Changes',
        description: `Do you want to save the changes you made to ${selectedFile.name}?`,
        confirmButtonText: 'Save and Close',
        denyButtonText: 'Close without Saving',
      });
      // If user chose "Save and Close"
      if (result) {
        saveFileChanges();
      }
      // The promptModal should return true or false based on the button clicked
      // We continue with closing only if a button was clicked (not dialog cancelled)
    }
    // Close the file
    setSelectedFile(null);
  };
  // Update file content and track edited state
  const handleEditorChange = (value) => {
    const newContent = value ?? '';
    setFileContent(newContent);
    // Check if content is different from the saved file
    if (selectedFile && newContent !== selectedFile.content) {
      setIsFileEdited(true);
    } else {
      setIsFileEdited(false);
    }
  };
  // Handle right-click for context menu
  const handleContextMenu = (event, item, parentPath = []) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      item,
      parentPath,
    });
  };
  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  const handleOpenDialog = async (type, item) => {
    // Get parent path from context menu
    let parentPath = contextMenu?.parentPath ?? [];
    // If we're creating a new file/folder and the context menu has a folder item selected,
    // add that folder to the parent path so the new item is created inside it
    if (
      (type === 'newFile' || type === 'newFolder') &&
      contextMenu?.item?.type === 'folder'
    ) {
      // Include the folder in the path
      parentPath = [...parentPath, contextMenu.item.name];
    }
    // Clear the context menu state completely
    setContextMenu(null);
    let newName = '';
    try {
      if (type === 'rename' && item) {
        newName = await editValue({
          title: `Rename ${item.type === 'file' ? 'File' : 'Folder'}`,
          oldValue: item.name,
        });
        if (newName && newName !== item.name) {
          renameItem(item, newName, parentPath);
        }
      } else if (type === 'newFile') {
        newName = await newValue({ title: 'Create New File' });
        if (newName) {
          addNewFile(newName, parentPath);
        }
      } else if (type === 'newFolder') {
        newName = await newValue({ title: 'Create New Folder' });
        if (newName) {
          addNewFolder(newName, parentPath);
        }
      }
    } catch (error) {
      console.error('Error handling dialog:', error);
    }
  };
  // Add new file
  const addNewFile = (fileName, customPath) => {
    if (!fileName.trim()) {
      return;
    }
    const newFile = {
      name: fileName,
      type: 'file',
      content: '',
    };
    const addFileToStructure = (items, path, newFile) => {
      if (path.length === 0) {
        return [...items, newFile];
      }
      const currentFolder = path[0];
      const remainingPath = path.slice(1);
      return items.map((item) => {
        if (item.type === 'folder' && item.name === currentFolder) {
          return {
            ...item,
            children: addFileToStructure(item.children, remainingPath, newFile),
          };
        }
        return item;
      });
    };
    // Use custom path if provided, otherwise use context menu path
    const newFilePath = customPath ?? contextMenu?.parentPath ?? [];
    const updatedStructure = addFileToStructure(
      folderStructure,
      newFilePath,
      newFile,
    );
    setFolderStructure(updatedStructure);
  };
  // Add new folder
  const addNewFolder = (folderName, customPath) => {
    if (!folderName.trim()) {
      return;
    }
    const newFolder = {
      name: folderName,
      type: 'folder',
      children: [],
    };
    const addFolderToStructure = (items, path, newFolder) => {
      if (path.length === 0) {
        return [...items, newFolder];
      }
      const currentFolder = path[0];
      const remainingPath = path.slice(1);
      return items.map((item) => {
        if (item.type === 'folder' && item.name === currentFolder) {
          return {
            ...item,
            children: addFolderToStructure(
              item.children,
              remainingPath,
              newFolder,
            ),
          };
        }
        return item;
      });
    };
    // Use custom path if provided, otherwise use context menu path
    const newFolderPath = customPath ?? contextMenu?.parentPath ?? [];
    const updatedStructure = addFolderToStructure(
      folderStructure,
      newFolderPath,
      newFolder,
    );
    setFolderStructure(updatedStructure);
  };
  // Rename file or folder
  const renameItem = (item, newName, parentPath = []) => {
    if (!newName.trim()) {
      return;
    }
    const renameItemInStructure = (items, path, itemToRename, newName) => {
      if (path.length === 0) {
        return items.map((currentItem) => {
          if (
            currentItem.name === itemToRename.name &&
            currentItem.type === itemToRename.type
          ) {
            return { ...currentItem, name: newName };
          }
          return currentItem;
        });
      }
      const currentFolder = path[0];
      const remainingPath = path.slice(1);
      return items.map((currItem) => {
        if (currItem.type === 'folder' && currItem.name === currentFolder) {
          return {
            ...currItem,
            children: renameItemInStructure(
              currItem.children,
              remainingPath,
              itemToRename,
              newName,
            ),
          };
        }
        return currItem;
      });
    };
    const updatedStructure = renameItemInStructure(
      folderStructure,
      parentPath,
      item,
      newName,
    );
    setFolderStructure(updatedStructure);
    // Update selectedFile if it was renamed
    if (
      selectedFile &&
      selectedFile.name === item.name &&
      item.type === 'file'
    ) {
      setSelectedFile({ ...selectedFile, name: newName });
    }
  };
  // Fix for non-null assertion in MenuItem
  const handleDeleteItem = () => {
    if (!contextMenu?.item) {
      return;
    }
    const item = contextMenu.item;
    // Store the relevant information
    const parentPath = contextMenu.parentPath ?? [];
    // Close the context menu immediately before showing the modal
    handleCloseContextMenu();
    void (async () => {
      await deleteItem(item, parentPath);
    })();
  };
  // Delete file or folder
  const deleteItem = async (item, parentPath = []) => {
    // Prompt user for confirmation before deleting
    const result = await promptModal({
      title: `Delete ${item.type === 'file' ? 'File' : 'Folder'}`,
      description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      denyButtonText: 'Cancel',
    });
    // Only proceed with deletion if the user confirmed
    if (!result) {
      return;
    }
    const deleteItemFromStructure = (items, path, itemName) => {
      if (path.length === 0) {
        return items.filter((item) => item.name !== itemName);
      }
      const currentFolder = path[0];
      const remainingPath = path.slice(1);
      return items.map((currItem) => {
        if (currItem.type === 'folder' && currItem.name === currentFolder) {
          return {
            ...currItem,
            children: deleteItemFromStructure(
              currItem.children,
              remainingPath,
              itemName,
            ),
          };
        }
        return currItem;
      });
    };
    // Use the passed parent path instead of getting from contextMenu
    // since contextMenu will already be null
    const updatedStructure = deleteItemFromStructure(
      folderStructure,
      parentPath,
      item.name,
    );
    setFolderStructure(updatedStructure);
    // Clear selectedFile if it was deleted
    if (selectedFile && selectedFile.name === item.name) {
      setSelectedFile(null);
    }
  };
  // Fix linter errors
  const handleContextMenuWithCheck = (e, item, parentPath = []) => {
    if (mode === 'edit') {
      handleContextMenu(e, item, parentPath);
    }
  };
  function renderTree(items, onSelectFile, parentId = '', parentPath = []) {
    const folderColor = mode === 'edit' ? 'text-yellow-500' : 'text-gray-200';
    return items.map((item, index) => {
      const itemId = `${parentId}-${item.name}-${String(index)}`;
      // Handle folder items
      if (item.type === 'folder') {
        return _jsx(
          TreeItem,
          {
            itemId: itemId,
            label: _jsxs('div', {
              className: 'flex items-center',
              onContextMenu: (e) => {
                handleContextMenuWithCheck(e, item, parentPath);
              },
              children: [
                _jsx(FolderIcon, { fontSize: 'small', className: folderColor }),
                '\u00A0',
                item.name,
              ],
            }),
            children: renderTree(item.children, onSelectFile, itemId, [
              ...parentPath,
              item.name,
            ]),
          },
          itemId,
        );
      }
      // Handle file items
      const uniqueId = createUniqueFileId(parentPath, item.name);
      return _jsx(
        TreeItem,
        {
          itemId: itemId,
          label: _jsxs('div', {
            className: 'flex items-center',
            onContextMenu: (e) => {
              handleContextMenuWithCheck(e, item, parentPath);
            },
            children: [
              _jsx(CodeIcon, {
                fontSize: 'small',
                className: 'text-yellow-500',
              }),
              '\u00A0',
              item.name,
            ],
          }),
          onClick: () => {
            // Create a file with uniqueId and pass it to the onSelectFile callback
            const fileWithUniqueId = {
              ...item,
              uniqueId,
            };
            onSelectFile(fileWithUniqueId);
          },
        },
        itemId,
      );
    });
  }
  /**
   * Generates a timestamp string in the format YYYY-MM-DD-HHmmss
   * @returns Formatted timestamp string
   */
  const generateTimestamp = () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  };
  // Add a function to get the sanitized project name for the zip file
  const getZipFileName = () => {
    // Get the base name (remove file extension if present)
    let baseName = 'project';
    if (typeof projectName === 'string' && projectName !== '') {
      // Convert to kebab case but preserve the original case
      baseName = projectName.replace(/\s+/g, '-');
    }
    // Generate timestamp
    const timestamp = generateTimestamp();
    // Return formatted filename
    return `${baseName}-${timestamp}.zip`;
  };
  // Add a function to download just a specific folder
  const downloadSelectedFolder = (folder, _folderPath) => {
    try {
      // Create a new IStructure with just this folder
      const folderStructureToDownload = [folder];
      // Use the folder name as the base for the zip file name
      const baseName = folder.name;
      // Generate timestamp
      const timestamp = generateTimestamp();
      // Final filename format: [folder-name]-[YYYY-MM-DD]-[HHmmss].zip
      const zipFileName = `${baseName}-${timestamp}.zip`;
      // Use the existing zip utility function to handle the download
      zipAndDownloadIStructure(folderStructureToDownload, zipFileName);
    } catch (error) {
      console.error('Error downloading folder:', error);
    }
  };
  const countFiles = (items) => {
    let count = 0;
    for (const item of items) {
      if (item.type === 'file') {
        count += 1;
      } else {
        count += countFiles(item.children);
      }
    }
    return count;
  };
  const handleCreateNewTestRepository = () => {
    void (async () => {
      setIsCreatingRepository(true);
      try {
        const accessTokenResult = await getAccessTokenSilently({
          authorizationParams: {
            audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          },
        });
        if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
          throw new Error('Failed to get access token');
        }
        const accessToken = accessTokenResult;
        const tokenResponse = await fetch(`${getApiUrl()}/github-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!tokenResponse.ok) {
          throw new Error('Failed to get GitHub token');
        }
        const tokenData = await tokenResponse.json();
        const isTokenResponse = (val) => {
          return (
            typeof val === 'object' &&
            val !== null &&
            ('success' in val || 'token' in val)
          );
        };
        if (
          !isTokenResponse(tokenData) ||
          tokenData.token === null ||
          tokenData.token === undefined ||
          tokenData.token === ''
        ) {
          throw new Error(
            'GitHub token not found. Please set your GitHub token in your profile.',
          );
        }
        const baseRepoName =
          typeof projectName === 'string' && projectName !== ''
            ? projectName.replace(/\s+/g, '-').toLowerCase()
            : 'scaffolded-project';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const repoName = `${baseRepoName}-${timestamp}`;
        const exportedAt = new Date();
        const humanDate = exportedAt.toLocaleString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const description = `This project was created using Scaffolder. Exported on ${humanDate}`;
        const createRepoResponse = await fetch(
          `${getApiUrl()}/create-github-repository`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              repoName,
              description,
              isPrivate: false,
            }),
          },
        );
        const createRepoResult = await createRepoResponse.json();
        const isCreateRepositoryResponse = (val) => {
          return (
            typeof val === 'object' &&
            val !== null &&
            ('success' in val ||
              'message' in val ||
              'repoUrl' in val ||
              'error' in val)
          );
        };
        if (!createRepoResponse.ok) {
          const errorMessage = isCreateRepositoryResponse(createRepoResult)
            ? (createRepoResult.error ?? 'Failed to create repository')
            : 'Failed to create repository';
          throw new Error(errorMessage);
        }
        if (
          !isCreateRepositoryResponse(createRepoResult) ||
          createRepoResult.repoUrl === undefined ||
          createRepoResult.repoUrl === ''
        ) {
          throw new Error('Failed to get repository URL');
        }
        const repoUrl = createRepoResult.repoUrl;
        const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
        const match = githubRegex.exec(repoUrl);
        if (match?.length !== 3) {
          throw new Error('Invalid repository URL format');
        }
        const owner = match[1];
        const repo = match[2];
        const uploadResponse = await fetch(
          `${getApiUrl()}/create-github-folder-structure`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              structure: folderStructure,
              owner,
              repo,
              branch: 'main',
              projectName,
            }),
          },
        );
        const uploadResult = await uploadResponse.json();
        const isUploadResponse = (val) => {
          return (
            typeof val === 'object' &&
            val !== null &&
            ('success' in val ||
              'message' in val ||
              'filesCreated' in val ||
              'error' in val)
          );
        };
        if (!uploadResponse.ok) {
          const errorMessage = isUploadResponse(uploadResult)
            ? (uploadResult.error ?? 'Failed to upload files')
            : 'Failed to upload files';
          throw new Error(errorMessage);
        }
        const filesCreated =
          isUploadResponse(uploadResult) &&
          uploadResult.filesCreated !== undefined
            ? uploadResult.filesCreated
            : 0;
        const cloneCommand = `git clone ${repoUrl}.git`;
        openRandomModal({
          title: 'Project Exported Successfully',
          content: _jsxs('div', {
            className: 'space-y-6',
            children: [
              _jsx('div', {
                className:
                  'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4',
                children: _jsxs('div', {
                  className: 'flex items-center gap-2 mb-2',
                  children: [
                    _jsx('svg', {
                      className: 'w-5 h-5 text-green-600 dark:text-green-400',
                      fill: 'none',
                      stroke: 'currentColor',
                      viewBox: '0 0 24 24',
                      children: _jsx('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeWidth: 2,
                        d: 'M5 13l4 4L19 7',
                      }),
                    }),
                    _jsxs('p', {
                      className:
                        'text-green-800 dark:text-green-200 font-semibold',
                      children: [
                        'Successfully exported ',
                        String(filesCreated),
                        ' file(s) to GitHub',
                      ],
                    }),
                  ],
                }),
              }),
              _jsxs('div', {
                className: 'space-y-4',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className:
                          'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',
                        children: 'Clone Repository',
                      }),
                      _jsxs('div', {
                        className:
                          'flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3',
                        children: [
                          _jsx('code', {
                            className:
                              'flex-1 text-sm text-gray-800 dark:text-gray-200 font-mono break-all',
                            children: cloneCommand,
                          }),
                          _jsxs('button', {
                            type: 'button',
                            onClick: () => {
                              handleCopy(cloneCommand);
                            },
                            className:
                              'flex-shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors duration-200 flex items-center gap-2',
                            title: 'Copy clone command',
                            children: [
                              _jsx(CopyIcon, { fontSize: 'small' }),
                              _jsx('span', {
                                className: 'text-sm',
                                children: 'Copy',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className:
                          'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',
                        children: 'Repository',
                      }),
                      _jsxs('a', {
                        href: repoUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className:
                          'inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors duration-200 font-medium',
                        children: [
                          _jsx('svg', {
                            className: 'w-5 h-5',
                            fill: 'currentColor',
                            viewBox: '0 0 24 24',
                            children: _jsx('path', {
                              d: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
                            }),
                          }),
                          _jsx('span', { children: 'Open Repository' }),
                          _jsx('svg', {
                            className: 'w-4 h-4',
                            fill: 'none',
                            stroke: 'currentColor',
                            viewBox: '0 0 24 24',
                            children: _jsx('path', {
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                              strokeWidth: 2,
                              d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
                            }),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              _jsx('div', {
                className:
                  'flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700',
                children: _jsx('button', {
                  type: 'button',
                  onClick: () => {
                    const modals = useModalStore.getState().modals;
                    if (modals.length > 0) {
                      useModalStore
                        .getState()
                        .closeModal(modals[modals.length - 1].id);
                    }
                  },
                  className:
                    'px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 font-medium',
                  children: 'Done',
                }),
              }),
            ],
          }),
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error('Failed to export project:', error.message);
          void promptModal({
            title: 'Error',
            description: `Failed to export project: ${error.message}`,
            confirmButtonText: 'OK',
            denyButtonText: '',
          });
        } else {
          console.error('An unexpected error occurred');
        }
      } finally {
        setIsCreatingRepository(false);
      }
    })();
  };
  const handleCreateTestFile = () => {
    void (async () => {
      if (!publicRepoURL || publicRepoURL === '') {
        console.error('Please provide a GitHub repository URL');
        return;
      }
      setIsCreatingFile(true);
      try {
        const accessTokenResult = await getAccessTokenSilently({
          authorizationParams: {
            audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          },
        });
        if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
          throw new Error('Failed to get access token');
        }
        const accessToken = accessTokenResult;
        const tokenResponse = await fetch(`${getApiUrl()}/github-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!tokenResponse.ok) {
          throw new Error('Failed to get GitHub token');
        }
        const tokenData = await tokenResponse.json();
        const isTokenResponse = (val) => {
          return (
            typeof val === 'object' &&
            val !== null &&
            ('success' in val || 'token' in val)
          );
        };
        if (
          !isTokenResponse(tokenData) ||
          tokenData.token === null ||
          tokenData.token === undefined ||
          tokenData.token === ''
        ) {
          throw new Error(
            'GitHub token not found. Please set your GitHub token in your profile.',
          );
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `dist/test-file-${timestamp}.txt`;
        const content = `Test file created at ${new Date().toISOString()}\nRepository: ${publicRepoURL}`;
        const response = await fetch(`${getApiUrl()}/create-github-file`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            publicRepoURL,
            filePath,
            content,
            commitMessage: `Create test file: ${filePath}`,
          }),
        });
        const result = await response.json();
        const isCreateFileResponse = (val) => {
          return (
            typeof val === 'object' &&
            val !== null &&
            ('success' in val ||
              'message' in val ||
              'url' in val ||
              'error' in val)
          );
        };
        if (!response.ok) {
          const errorMessage = isCreateFileResponse(result)
            ? (result.error ?? 'Failed to create file')
            : 'Failed to create file';
          throw new Error(errorMessage);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Failed to create file:', error.message);
        } else {
          console.error('An unexpected error occurred');
        }
      } finally {
        setIsCreatingFile(false);
      }
    })();
  };
  const handleCreateApp = async () => {
    try {
      // Create formData object from the current state
      const formData = {
        backendDir,
        publicRepoURL,
        dbConnection,
        projectName,
        selectedProject: selectedProject
          ? {
              name: selectedProject.name,
              content: selectedProject.content,
              type: selectedProject.type,
            }
          : null,
      };
      // Make API call to create files
      const response = await fetch(`${getApiUrl()}/create-local-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemaInfo,
          SQLSchema,
          formData,
        }),
      });
      const data = await response.json();
      if (
        data !== null &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === true
      ) {
        /*prettier-ignore*/ (($ = 'Success!') => { const isObject = (obj) => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr) => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) {
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
                } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();
      } else {
        /*prettier-ignore*/ (($ = 'Fail!') => { const isObject = (obj) => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr) => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) {
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
                } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();
      }
    } catch (error) {
      console.error('Error creating app:', error);
      void promptModal({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create app',
        confirmButtonText: 'OK',
        denyButtonText: '',
      });
    }
  };
  return _jsxs('div', {
    className: 'h-96 p-2',
    ref: fileViewerRef,
    children: [
      _jsxs('div', {
        className: 'flex gap-2 mb-2',
        children: [
          _jsx('button', {
            type: 'button',
            onClick: () => void handleCreateApp(),
            className:
              'sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
            children: 'Create App!',
          }),
          _jsx('button', {
            type: 'button',
            onClick: handleCreateTestFile,
            disabled: isCreatingFile || !publicRepoURL,
            className: `text-xs h-max w-max px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
              isCreatingFile || !publicRepoURL
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`,
            children: isCreatingFile ? 'Creating...' : 'Create Test File',
          }),
          _jsx('button', {
            type: 'button',
            onClick: handleCreateNewTestRepository,
            disabled: isCreatingRepository || folderStructure.length === 0,
            className: `text-xs h-max w-max px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
              isCreatingRepository || folderStructure.length === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`,
            children: isCreatingRepository
              ? `Exporting ${String(countFiles(folderStructure))} files...`
              : `Export Into A New Repository (${String(countFiles(folderStructure))} files)`,
          }),
        ],
      }),
      _jsx('br', {}),
      _jsxs('div', {
        className: 'grid grid-cols-1 md:grid-cols-3 text-white',
        children: [
          _jsx('div', {
            className: 'col-span-1 bg-gray-800 select-none mr-2',
            children: _jsxs('div', {
              children: [
                _jsx('div', {
                  className: 'flex justify-between mb-4',
                  children:
                    mode === 'edit' &&
                    _jsxs('div', {
                      className: 'flex items-center justify-between w-full',
                      children: [
                        process.env.NODE_ENV === 'development' &&
                          _jsxs(_Fragment, {
                            children: [
                              _jsx('div', {
                                children: _jsx('button', {
                                  onClick: () => {
                                    handleCopy(
                                      JSON.stringify(userFiles, null, 4),
                                    );
                                  },
                                  className:
                                    'sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                                  children: 'Copy User Files',
                                }),
                              }),
                              _jsx('div', {
                                children: _jsx('button', {
                                  onClick: () => {
                                    handleCopy(
                                      JSON.stringify(folderStructure, null, 4),
                                    );
                                  },
                                  className:
                                    'sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                                  children: 'Copy Project Structure',
                                }),
                              }),
                            ],
                          }),
                        _jsx('button', {
                          onClick: () => {
                            zipAndDownloadIStructure(
                              folderStructure,
                              getZipFileName(),
                            );
                          },
                          className:
                            'h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center',
                          title: 'Download Project Files',
                          'aria-label': 'Download Project Files',
                          children: _jsx(DownloadIcon, { fontSize: 'small' }),
                        }),
                        _jsxs('div', {
                          className: 'flex space-x-2',
                          children: [
                            _jsx('button', {
                              onClick: () => {
                                void (async () => {
                                  await handleOpenDialog('newFile');
                                })();
                              },
                              className:
                                'h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center',
                              title: 'New File',
                              'aria-label': 'New File',
                              children: _jsx(NoteAddIcon, {
                                fontSize: 'small',
                              }),
                            }),
                            _jsx('button', {
                              onClick: () => {
                                void (async () => {
                                  await handleOpenDialog('newFolder');
                                })();
                              },
                              className:
                                'h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center',
                              title: 'New Folder',
                              'aria-label': 'New Folder',
                              children: _jsx(CreateNewFolderIcon, {
                                fontSize: 'small',
                              }),
                            }),
                          ],
                        }),
                      ],
                    }),
                }),
                _jsx('div', {
                  className: 'overflow-auto max-h-80',
                  onContextMenu: (e) => {
                    if (mode === 'edit') {
                      handleContextMenu(e);
                    }
                  },
                  children: _jsx(SimpleTreeView, {
                    children: renderTree(folderStructure, setSelectedFile),
                  }),
                }),
              ],
            }),
          }),
          _jsx('div', {
            className: 'col-span-1 md:col-span-2',
            children:
              selectedFile &&
              _jsxs('div', {
                className: 'bg-gray-900',
                children: [
                  _jsxs('div', {
                    className:
                      'mt-2 sticky left-0 top-0 z-20 bg-gray-800 grid grid-cols-[auto_auto] items-center m-0',
                    children: [
                      _jsx('div', {
                        children: _jsxs('div', {
                          className:
                            'bg-[#1f1f1f] w-max p-2 rounded-t-md flex items-center',
                          children: [
                            _jsxs('span', {
                              children: [
                                selectedFile.name,
                                isFileEdited ? ' •' : '',
                                '\u00A0',
                              ],
                            }),
                            _jsx('button', {
                              onClick: () => void handleCloseFile(),
                              className:
                                'hover:bg-gray-700 text-white px-1 pb-1 rounded transition-colors duration-150',
                              children: _jsx(CloseIcon, { fontSize: 'small' }),
                            }),
                          ],
                        }),
                      }),
                      _jsxs('div', {
                        children: [
                          _jsx('button', {
                            onClick: () => {
                              handleCopy(selectedFile.content);
                            },
                            className:
                              'hover:bg-gray-700 text-white px-2 py-1 rounded float-right',
                            children: _jsx(CopyIcon, { fontSize: 'small' }),
                          }),
                          mode === 'edit' &&
                            isFileEdited &&
                            _jsx('button', {
                              onClick: saveFileChanges,
                              className:
                                'hover:bg-gray-700 text-white px-2 py-1 rounded float-right transition-all duration-150',
                              children: _jsx(SaveIcon, { fontSize: 'small' }),
                            }),
                        ],
                      }),
                    ],
                  }),
                  isImageFile(selectedFile.name)
                    ? _jsx('div', {
                        className:
                          'flex items-center justify-center bg-gray-900 p-4',
                        style: { height: '20rem' },
                        children: _jsx('img', {
                          src: `data:image/${selectedFile.name.split('.').pop() ?? 'png'};base64,${selectedFile.content}`,
                          alt: selectedFile.name,
                          className: 'max-h-full max-w-full object-contain',
                        }),
                      })
                    : _jsx(Editor, {
                        height: '20rem',
                        defaultValue: selectedFile.content,
                        value: fileContent,
                        language: (() => {
                          const fileExtension = selectedFile.name
                            .split('.')
                            .pop();
                          if (fileExtension === undefined) {
                            return 'plaintext';
                          }
                          const languageMap = {
                            ts: 'typescript',
                            js: 'javascript',
                            php: 'php',
                            css: 'css',
                            sass: 'sass',
                            java: 'java',
                            sql: 'sql',
                            txt: 'plaintext',
                            jsx: 'javascript',
                            tsx: 'typescript',
                          };
                          return languageMap[fileExtension] ?? 'plaintext';
                        })(),
                        theme: 'vs-dark',
                        options: {
                          readOnly: mode === 'view',
                          domReadOnly: mode === 'view',
                          minimap: { enabled: true },
                          fontSize: 14,
                          lineNumbers: 'on',
                        },
                        onChange: handleEditorChange,
                        onMount: handleEditorDidMount,
                      }),
                ],
              }),
          }),
        ],
      }),
      contextMenu &&
        _jsx(ContextMenu, {
          x: contextMenu.mouseX,
          y: contextMenu.mouseY,
          menuItems: (() => {
            const menuItems = [];
            // Root level menu (no item selected)
            if (!contextMenu.item) {
              menuItems.push(
                {
                  id: 'newFile',
                  icon: _jsx(NoteAddIcon, { fontSize: 'small' }),
                  label: 'New File',
                  onClick: () => {
                    void (async () => {
                      await handleOpenDialog('newFile');
                    })();
                  },
                },
                {
                  id: 'newFolder',
                  icon: _jsx(CreateNewFolderIcon, { fontSize: 'small' }),
                  label: 'New Folder',
                  onClick: () => {
                    void (async () => {
                      await handleOpenDialog('newFolder');
                    })();
                  },
                },
              );
            }
            // Item-specific menu options
            if (contextMenu.item) {
              // Common options for both files and folders
              menuItems.push(
                {
                  id: 'rename',
                  label: 'Rename',
                  onClick: () => {
                    void (async () => {
                      await handleOpenDialog('rename', contextMenu.item);
                    })();
                  },
                },
                {
                  id: 'delete',
                  label: 'Delete',
                  onClick: handleDeleteItem,
                },
              );
              // Folder-specific options
              if (contextMenu.item.type === 'folder') {
                menuItems.push(
                  {
                    id: 'newFileInFolder',
                    label: 'New File',
                    onClick: () => {
                      void (async () => {
                        await handleOpenDialog('newFile');
                      })();
                    },
                  },
                  {
                    id: 'newFolderInFolder',
                    label: 'New Folder',
                    onClick: () => {
                      void (async () => {
                        await handleOpenDialog('newFolder');
                      })();
                    },
                  },
                  {
                    id: 'downloadFolder',
                    label: 'Download Selected Folder',
                    onClick: () => {
                      if (contextMenu.item?.type === 'folder') {
                        downloadSelectedFolder(
                          contextMenu.item,
                          contextMenu.parentPath ?? [],
                        );
                      }
                    },
                  },
                );
                // Add Copy Folder Structure option only in development mode
                if (process.env.NODE_ENV === 'development') {
                  menuItems.push({
                    id: 'copyFolderStructure',
                    label: 'Copy Folder Structure',
                    onClick: () => {
                      if (contextMenu.item?.type === 'folder') {
                        // Find the folder in the structure
                        const findFolderInStructure = (
                          items,
                          path,
                          folderName,
                        ) => {
                          if (path.length === 0) {
                            const folderCandidate = items.find(
                              (item) =>
                                item.type === 'folder' &&
                                item.name === folderName,
                            );
                            return folderCandidate?.type === 'folder'
                              ? folderCandidate
                              : null;
                          }
                          const currentFolder = path[0];
                          const remainingPath = path.slice(1);
                          for (const item of items) {
                            if (
                              item.type === 'folder' &&
                              item.name === currentFolder
                            ) {
                              return findFolderInStructure(
                                item.children,
                                remainingPath,
                                folderName,
                              );
                            }
                          }
                          return null;
                        };
                        const folder = findFolderInStructure(
                          folderStructure,
                          contextMenu.parentPath ?? [],
                          contextMenu.item.name,
                        );
                        if (folder) {
                          handleCopy(JSON.stringify(folder, null, 4));
                        }
                      }
                    },
                  });
                }
              }
            }
            return menuItems;
          })(),
          onClose: handleCloseContextMenu,
        }),
    ],
  });
}
export default FileViewer;
