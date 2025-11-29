import type React from 'react';
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
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { handleCopy } from '@/helpers/stringHelper.ts';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import ContextMenu from '@/components/UI/ContextMenu.tsx';
import zipAndDownloadIStructure from '@/utils/zipIStructure.ts';
import { useFormStore } from '@/useFormStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import { useFileContent } from '@/hooks/useFileContent.ts';

export interface IBase {
  name: string;
  type: 'file' | 'folder';
}

export interface IFile extends IBase {
  type: 'file';
  content: string;
  uniqueId?: string;
  isBinary?: boolean;
  filePath?: string;
}

export interface IFolder extends IBase {
  type: 'folder';
  children: (IFile | IFolder)[];
}

export type IStructure = (IFile | IFolder)[];

interface ICodeEditor {
  getValue(): string;
}

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

const isImageFile = (filename: string): boolean => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};

const isHtmlFile = (filename: string): boolean => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return ext === '.html' || ext === '.htm';
};

const createUniqueFileId = (path: string[], fileName: string): string => {
  return [...path, fileName].join('/');
};

function FileViewer({
  folderStructure: initialFolderStructure,
  mode,
  projectName,
}: {
  folderStructure: IStructure;
  mode: 'edit' | 'view';
  projectName?: string;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const { schemaInfo, SQLSchema } = useTransformationsStore();
  const { backendDir, publicRepoURL, dbConnection } = useFormStore();
  const { editValue, newValue, promptModal, openRandomModal } = useModalStore();
  const { selectedProject } = useProjectStore();
  const { userFiles } = useMockDatabaseStore();
  const [folderStructure, setFolderStructure] = useState<IStructure>(
    initialFolderStructure,
  );
  const [selectedFile, setSelectedFile] = useState<
    (IFile & { uniqueId: string }) | null
  >(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isFileEdited, setIsFileEdited] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item?: IFile | IFolder;
    parentPath?: string[];
  } | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const editorRef = useRef<ICodeEditor | null>(null);
  const fileViewerRef = useRef<HTMLDivElement>(null);
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [isCreatingRepository, setIsCreatingRepository] =
    useState<boolean>(false);

  // Save file content changes - wrapped in useCallback
  const saveFileChanges = useCallback(() => {
    if (!selectedFile || !editorRef.current) {
      return;
    }

    const newContent = editorRef.current.getValue();

    const updateFileInStructure = (
      items: IStructure,
      path: string[],
      fileName: string,
      newContent: string,
    ): IStructure => {
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

  const filePath =
    selectedFile?.filePath ??
    (selectedFile ? createUniqueFileId(currentPath, selectedFile.name) : '');

  // Only fetch if:
  // 1. File is selected
  // 2. Content is empty (not yet loaded)
  // 3. We have a valid repo URL and file path
  // 4. The file doesn't already have content in the structure
  const shouldFetchContent = !!(
    selectedFile &&
    selectedFile.content === '' &&
    typeof publicRepoURL === 'string' &&
    publicRepoURL !== '' &&
    filePath !== '' &&
    filePath !== ''
  );

  const {
    data: fetchedFileContent,
    isLoading: isFileContentLoading,
    error: fileContentError,
  } = useFileContent(
    {
      publicRepoURL: publicRepoURL || '',
      filePath: filePath || '',
    },
    shouldFetchContent,
  );

  useEffect(() => {
    if (fetchedFileContent && selectedFile) {
      const updateFileInStructure = (
        items: IStructure,
        path: string[],
        fileName: string,
        newContent: string,
        isBinary: boolean,
        filePathToStore: string,
      ): IStructure => {
        if (path.length === 0) {
          return items.map((item) => {
            if (item.type === 'file' && item.name === fileName) {
              return {
                ...item,
                content: newContent,
                isBinary,
                filePath: filePathToStore || item.filePath,
              };
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
                isBinary,
                filePathToStore,
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
        fetchedFileContent.content,
        fetchedFileContent.isBinary,
        filePath,
      );
      setFolderStructure(updatedStructure);
    }
  }, [
    fetchedFileContent,
    selectedFile,
    folderStructure,
    currentPath,
    filePath,
  ]);

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.content) {
        setFileContent(selectedFile.content);
      } else if (fetchedFileContent) {
        setFileContent(fetchedFileContent.content);
      } else {
        setFileContent('');
      }
      setIsFileEdited(false);
    }
  }, [selectedFile, fetchedFileContent]);

  // Modified effect to find file by uniqueId instead of just name
  // This syncs selectedFile with the latest content from folderStructure
  useEffect(() => {
    if (selectedFile) {
      const findFileByUniqueId = (
        items: IStructure,
        path: string[] = [],
      ): { file: IFile | null; path: string[] } => {
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
        // Create a file with uniqueId and ensure filePath is set
        const fileWithUniqueId = {
          ...file,
          uniqueId: createUniqueFileId(path, file.name),
          filePath: file.filePath ?? createUniqueFileId(path, file.name),
        };
        // Only update if content changed to avoid infinite loops
        if (
          fileWithUniqueId.content !== selectedFile.content ||
          fileWithUniqueId.filePath !== selectedFile.filePath
        ) {
          setSelectedFile(fileWithUniqueId);
        }
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
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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
  const handleEditorDidMount: OnMount = (editor) => {
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
  const handleEditorChange = (value: string | undefined) => {
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
  const handleContextMenu = (
    event: React.MouseEvent,
    item?: IFile | IFolder,
    parentPath: string[] = [],
  ) => {
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

  const handleOpenDialog = async (
    type: 'newFile' | 'newFolder' | 'rename',
    item?: IFile | IFolder,
  ) => {
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
  const addNewFile = (fileName: string, customPath?: string[]) => {
    if (!fileName.trim()) {
      return;
    }

    const newFile: IFile = {
      name: fileName,
      type: 'file',
      content: '',
    };

    const addFileToStructure = (
      items: IStructure,
      path: string[],
      newFile: IFile,
    ): IStructure => {
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
  const addNewFolder = (folderName: string, customPath?: string[]) => {
    if (!folderName.trim()) {
      return;
    }

    const newFolder: IFolder = {
      name: folderName,
      type: 'folder',
      children: [],
    };

    const addFolderToStructure = (
      items: IStructure,
      path: string[],
      newFolder: IFolder,
    ): IStructure => {
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
  const renameItem = (
    item: IFile | IFolder,
    newName: string,
    parentPath: string[] = [],
  ) => {
    if (!newName.trim()) {
      return;
    }

    const renameItemInStructure = (
      items: IStructure,
      path: string[],
      itemToRename: IFile | IFolder,
      newName: string,
    ): IStructure => {
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
  const deleteItem = async (
    item: IFile | IFolder,
    parentPath: string[] = [],
  ) => {
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

    const deleteItemFromStructure = (
      items: IStructure,
      path: string[],
      itemName: string,
    ): IStructure => {
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

  const handleDownloadHtmlAsPdf = (htmlContent: string, _fileName: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      console.error('Failed to open print window');
      URL.revokeObjectURL(url);
      return;
    }

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 250);
    };
  };

  // Fix linter errors
  const handleContextMenuWithCheck = (
    e: React.MouseEvent,
    item?: IFile | IFolder,
    parentPath: string[] = [],
  ) => {
    if (mode === 'edit') {
      handleContextMenu(e, item, parentPath);
    }
  };

  function renderTree(
    items: IStructure,
    onSelectFile: (file: IFile & { uniqueId: string }) => void,
    parentId = '',
    parentPath: string[] = [],
  ) {
    const folderColor = mode === 'edit' ? 'text-yellow-500' : 'text-gray-200';
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') {
        return -1;
      }
      if (a.type === 'file' && b.type === 'folder') {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
    return sortedItems.map((item, index) => {
      const itemId = `${parentId}-${item.name}-${String(index)}`;

      // Handle folder items
      if (item.type === 'folder') {
        return (
          <TreeItem
            key={itemId}
            itemId={itemId}
            label={
              <div
                className="flex items-center"
                onContextMenu={(e) => {
                  handleContextMenuWithCheck(e, item, parentPath);
                }}
              >
                <FolderIcon fontSize="small" className={folderColor} />
                &nbsp;
                {item.name}
              </div>
            }
          >
            {renderTree(item.children, onSelectFile, itemId, [
              ...parentPath,
              item.name,
            ])}
          </TreeItem>
        );
      }

      // Handle file items
      const uniqueId = createUniqueFileId(parentPath, item.name);
      return (
        <TreeItem
          key={itemId}
          itemId={itemId}
          label={
            <div
              className="flex items-center"
              onContextMenu={(e) => {
                handleContextMenuWithCheck(e, item, parentPath);
              }}
            >
              <CodeIcon fontSize="small" className="text-yellow-500" />
              &nbsp;
              {item.name}
            </div>
          }
          onClick={() => {
            // Create a file with uniqueId and filePath, then pass it to the onSelectFile callback
            // Use existing filePath if available, otherwise use uniqueId
            const fileWithUniqueId = {
              ...item,
              uniqueId,
              filePath: item.filePath ?? uniqueId,
            };
            onSelectFile(fileWithUniqueId);
            if (isHtmlFile(item.name) && item.content && item.content !== '') {
              openRandomModal({
                title: item.name,
                size: 'fullscreen',
                content: (
                  <div className="w-full h-full min-h-0 flex flex-col">
                    <div className="flex justify-end gap-2 mb-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.content) {
                            handleDownloadHtmlAsPdf(item.content, item.name);
                          }
                        }}
                        disabled={!item.content}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm focus:outline-none focus:ring focus:ring-green-500 focus:ring-opacity-50 flex items-center gap-2 transition-colors"
                        title="Download as PDF"
                      >
                        <PictureAsPdfIcon fontSize="small" />
                        <span>Download as PDF</span>
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <iframe
                        srcDoc={item.content}
                        className="w-full h-full border-0 rounded"
                        title={item.name}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  </div>
                ),
              });
            }
          }}
        />
      );
    });
  }

  /**
   * Generates a timestamp string in the format YYYY-MM-DD-HHmmss
   * @returns Formatted timestamp string
   */
  const generateTimestamp = (): string => {
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
  const getZipFileName = (): string => {
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
  const downloadSelectedFolder = (
    folder: IFolder,
    _folderPath: string[],
  ): void => {
    try {
      // Create a new IStructure with just this folder
      const folderStructureToDownload: IStructure = [folder];

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

  const countFiles = (items: IStructure): number => {
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
        const accessToken: string = accessTokenResult;

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

        const tokenData: unknown = await tokenResponse.json();
        interface ITokenResponse {
          success?: boolean;
          token?: string | null;
        }
        const isTokenResponse = (val: unknown): val is ITokenResponse => {
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

        const createRepoResult: unknown = await createRepoResponse.json();

        interface ICreateRepositoryResponse {
          success?: boolean;
          message?: string;
          repoUrl?: string;
          error?: string;
        }

        const isCreateRepositoryResponse = (
          val: unknown,
        ): val is ICreateRepositoryResponse => {
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

        const uploadResult: unknown = await uploadResponse.json();

        interface IUploadResponse {
          success?: boolean;
          message?: string;
          filesCreated?: number;
          error?: string;
        }

        const isUploadResponse = (val: unknown): val is IUploadResponse => {
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
          content: (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-green-800 dark:text-green-200 font-semibold">
                    Successfully exported {String(filesCreated)} file(s) to
                    GitHub
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Clone Repository
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                    <code className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-mono break-all">
                      {cloneCommand}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(cloneCommand);
                      }}
                      className="flex-shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                      title="Copy clone command"
                    >
                      <CopyIcon fontSize="small" />
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Repository
                  </label>
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors duration-200 font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>Open Repository</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    const modals = useModalStore.getState().modals;
                    if (modals.length > 0) {
                      useModalStore
                        .getState()
                        .closeModal(modals[modals.length - 1].id);
                    }
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          ),
        });
      } catch (error: unknown) {
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
        const accessToken: string = accessTokenResult;

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

        const tokenData: unknown = await tokenResponse.json();
        interface ITokenResponse {
          success?: boolean;
          token?: string | null;
        }
        const isTokenResponse = (val: unknown): val is ITokenResponse => {
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

        const result: unknown = await response.json();

        interface ICreateFileResponse {
          success?: boolean;
          message?: string;
          url?: string;
          error?: string;
        }

        const isCreateFileResponse = (
          val: unknown,
        ): val is ICreateFileResponse => {
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
      } catch (error: unknown) {
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

      const data: unknown = await response.json();

      if (
        data !== null &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === true
      ) {
        /*prettier-ignore*/ (($= 'Success!') => { const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();
      } else {
        /*prettier-ignore*/ (($= 'Fail!') => { const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();
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

  return (
    <div className="h-96 p-2" ref={fileViewerRef}>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => void handleCreateApp()}
          className="sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
        >
          Create App!
        </button>
        <button
          type="button"
          onClick={handleCreateTestFile}
          disabled={isCreatingFile || !publicRepoURL}
          className={`text-xs h-max w-max px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
            isCreatingFile || !publicRepoURL
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isCreatingFile ? 'Creating...' : 'Create Test File'}
        </button>
        <button
          type="button"
          onClick={handleCreateNewTestRepository}
          disabled={isCreatingRepository || folderStructure.length === 0}
          className={`text-xs h-max w-max px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
            isCreatingRepository || folderStructure.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isCreatingRepository
            ? `Exporting ${String(countFiles(folderStructure))} files...`
            : `Export Into A New Repository (${String(countFiles(folderStructure))} files)`}
        </button>
      </div>
      <br />
      <div className="grid grid-cols-1 md:grid-cols-3 text-white">
        <div className="col-span-1 bg-gray-800 select-none mr-2">
          <div>
            <div className="flex justify-between mb-4">
              {mode === 'edit' && (
                <div className="flex items-center justify-between w-full">
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <div>
                        <button
                          onClick={() => {
                            handleCopy(JSON.stringify(userFiles, null, 4));
                          }}
                          className="sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                        >
                          Copy User Files
                        </button>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            handleCopy(
                              JSON.stringify(folderStructure, null, 4),
                            );
                          }}
                          className="sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                        >
                          Copy Project Structure
                        </button>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      zipAndDownloadIStructure(
                        folderStructure,
                        getZipFileName(),
                      );
                    }}
                    className="h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center"
                    title="Download Project Files"
                    aria-label="Download Project Files"
                  >
                    <DownloadIcon fontSize="small" />
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFile');
                        })();
                      }}
                      className="h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center"
                      title="New File"
                      aria-label="New File"
                    >
                      <NoteAddIcon fontSize="small" />
                    </button>
                    <button
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFolder');
                        })();
                      }}
                      className="h-max w-max p-1 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 flex items-center"
                      title="New Folder"
                      aria-label="New Folder"
                    >
                      <CreateNewFolderIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className="overflow-auto max-h-80"
              onContextMenu={(e) => {
                if (mode === 'edit') {
                  handleContextMenu(e);
                }
              }}
            >
              <SimpleTreeView>
                {renderTree(folderStructure, setSelectedFile)}
              </SimpleTreeView>
            </div>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          {selectedFile && (
            <div className="bg-gray-900">
              <div className="mt-2 sticky left-0 top-0 z-20 bg-gray-800 grid grid-cols-[auto_auto] items-center m-0">
                <div>
                  <div className="bg-[#1f1f1f] w-max p-2 rounded-t-md flex items-center">
                    <span>
                      {selectedFile.name}
                      {isFileEdited ? ' •' : ''}&nbsp;
                    </span>
                    <button
                      onClick={() => void handleCloseFile()}
                      className="hover:bg-gray-700 text-white px-1 pb-1 rounded transition-colors duration-150"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => {
                      if (selectedFile.content) {
                        handleCopy(selectedFile.content);
                      }
                    }}
                    disabled={!selectedFile.content}
                    className="hover:bg-gray-700 text-white px-2 py-1 rounded float-right disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CopyIcon fontSize="small" />
                  </button>
                  {mode === 'edit' && isFileEdited && (
                    <button
                      onClick={saveFileChanges}
                      className="hover:bg-gray-700 text-white px-2 py-1 rounded float-right transition-all duration-150"
                    >
                      <SaveIcon fontSize="small" />
                    </button>
                  )}
                </div>
              </div>
              {isFileContentLoading ? (
                <div
                  className="flex items-center justify-center bg-gray-900 p-4"
                  style={{ height: '20rem' }}
                >
                  <div className="text-white">Loading file content...</div>
                </div>
              ) : fileContentError ? (
                <div
                  className="flex items-center justify-center bg-gray-900 p-4"
                  style={{ height: '20rem' }}
                >
                  <div className="text-red-400">
                    Error loading file:{' '}
                    {fileContentError instanceof Error
                      ? fileContentError.message
                      : 'Unknown error'}
                  </div>
                </div>
              ) : isImageFile(selectedFile.name) && fileContent ? (
                <div
                  className="flex items-center justify-center bg-gray-900 p-4"
                  style={{ height: '20rem' }}
                >
                  {selectedFile.name.toLowerCase().endsWith('.svg') &&
                  !fileContent.startsWith('data:') &&
                  !fileContent.includes('base64') &&
                  fileContent.trim().startsWith('<') ? (
                    <div
                      className="max-h-full max-w-full"
                      dangerouslySetInnerHTML={{ __html: fileContent }}
                    />
                  ) : (
                    <img
                      src={`data:image/${selectedFile.name.split('.').pop() ?? 'png'};base64,${fileContent}`}
                      alt={selectedFile.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <Editor
                  height="20rem"
                  defaultValue={selectedFile.content}
                  value={fileContent}
                  language={(() => {
                    const fileExtension: string | undefined = selectedFile.name
                      .split('.')
                      .pop();
                    if (fileExtension === undefined) {
                      return 'plaintext';
                    }
                    const languageMap: Record<string, string> = {
                      ts: 'typescript',
                      js: 'javascript',
                      php: 'php',
                      css: 'css',
                      sass: 'sass',
                      scss: 'scss',
                      java: 'java',
                      sql: 'sql',
                      txt: 'plaintext',
                      jsx: 'javascript',
                      tsx: 'typescript',
                      html: 'html',
                      htm: 'html',
                      xml: 'xml',
                      json: 'json',
                      yaml: 'yaml',
                      yml: 'yaml',
                      md: 'markdown',
                      markdown: 'markdown',
                      sh: 'shell',
                      bash: 'shell',
                      zsh: 'shell',
                      py: 'python',
                      rb: 'ruby',
                      go: 'go',
                      rs: 'rust',
                      cpp: 'cpp',
                      c: 'c',
                      h: 'c',
                      hpp: 'cpp',
                      cs: 'csharp',
                      swift: 'swift',
                      kt: 'kotlin',
                      dockerfile: 'dockerfile',
                      tf: 'hcl',
                      terraform: 'hcl',
                    };
                    return languageMap[fileExtension] ?? 'plaintext';
                  })()}
                  theme="vs-dark"
                  options={{
                    readOnly: mode === 'view',
                    domReadOnly: mode === 'view',
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                  }}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.mouseX}
          y={contextMenu.mouseY}
          menuItems={(() => {
            const menuItems = [];

            // Root level menu (no item selected)
            if (!contextMenu.item) {
              menuItems.push(
                {
                  id: 'newFile',
                  icon: <NoteAddIcon fontSize="small" />,
                  label: 'New File',
                  onClick: () => {
                    void (async () => {
                      await handleOpenDialog('newFile');
                    })();
                  },
                },
                {
                  id: 'newFolder',
                  icon: <CreateNewFolderIcon fontSize="small" />,
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
                          items: IStructure,
                          path: string[],
                          folderName: string,
                        ): IFolder | null => {
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
          })()}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

export default FileViewer;
