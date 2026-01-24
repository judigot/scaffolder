import { useAuth0 } from '@auth0/auth0-react';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  NoteAdd as NoteAddIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import GitHubExportModal from '@/components/GitHubExportModal.tsx';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import ContextMenu from '@/components/UI/ContextMenu.tsx';
import { handleCopy } from '@/helpers/stringHelper.ts';
import { useDecryptedUserMetadata } from '@/hooks/useDecryptedUserMetadata.ts';
import { useFileContent } from '@/hooks/useFileContent.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { useUserProfileStore } from '@/useUserProfileStore.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import type { IFailedFormatEntry } from '@/utils/project-builder/buildProjectFiles.ts';
import { detectUserEnvInStructure } from '@/utils/project-builder/utils/detectUserEnvUsage.ts';
import zipAndDownloadIStructure from '@/utils/zipIStructure.ts';

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

interface IProjectOption {
  name: string;
}

function FileViewer({
  folderStructure: initialFolderStructure,
  mode,
  projectName,
  filesUsingUserEnv = [],
  filesFailedToFormat = [],
  projects = [],
  selectedProject: selectedProjectProp,
  onProjectChange,
}: {
  folderStructure: IStructure;
  mode: 'edit' | 'view';
  projectName?: string;
  filesUsingUserEnv?: string[];
  filesFailedToFormat?: IFailedFormatEntry[];
  projects?: IProjectOption[];
  selectedProject?: IProjectOption;
  onProjectChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const safeFilesUsingUserEnv = filesUsingUserEnv;

  const { getAccessTokenSilently } = useAuth0();
  const {
    githubToken,
    isLoading: isUserLoading,
    serverConfigStatus,
    userMetadata,
    user,
  } = useUser();
  const { decryptedMetadata } = useDecryptedUserMetadata();
  const { openUserProfile } = useUserProfileStore();
  const { schemaInfo, SQLSchema } = useTransformationsStore();
  const { backendDir, publicRepoURL, dbConnection } = useFormStore();
  const { editValue, newValue, promptModal, openRandomModal, openModal } =
    useModalStore();
  const { selectedProject } = useProjectStore();
  const { userFiles } = useMockDatabaseStore();

  const [folderStructure, setFolderStructure] = useState<IStructure>(
    initialFolderStructure,
  );
  const [openFiles, setOpenFiles] = useState<(IFile & { uniqueId: string })[]>(
    [],
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [editedFiles, setEditedFiles] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<string>('');

  // Derived state: get the currently active file from openFiles
  const selectedFile =
    openFiles.find((f) => f.uniqueId === activeFileId) ?? null;
  const isFileEdited = activeFileId !== null && editedFiles.has(activeFileId);

  // Helper: open a file (add to tabs if not already open, then activate)
  const openFile = useCallback((file: IFile & { uniqueId: string }) => {
    setOpenFiles((prev) => {
      const exists = prev.some((f) => f.uniqueId === file.uniqueId);
      if (exists) {
        return prev;
      }
      return [...prev, file];
    });
    setActiveFileId(file.uniqueId);
  }, []);

  // Helper: close a file tab
  const closeFile = useCallback(
    (uniqueId: string) => {
      setOpenFiles((prev) => {
        const newFiles = prev.filter((f) => f.uniqueId !== uniqueId);
        // If closing active file, activate the previous or next file
        if (activeFileId === uniqueId && newFiles.length > 0) {
          const closedIndex = prev.findIndex((f) => f.uniqueId === uniqueId);
          const newActiveIndex = Math.min(closedIndex, newFiles.length - 1);
          setActiveFileId(newFiles[newActiveIndex]?.uniqueId ?? null);
        } else if (newFiles.length === 0) {
          setActiveFileId(null);
        }
        return newFiles;
      });
      setEditedFiles((prev) => {
        const next = new Set(prev);
        next.delete(uniqueId);
        return next;
      });
    },
    [activeFileId],
  );

  // Helper: mark file as edited
  const markFileEdited = useCallback((uniqueId: string, edited: boolean) => {
    setEditedFiles((prev) => {
      const next = new Set(prev);
      if (edited) {
        next.add(uniqueId);
      } else {
        next.delete(uniqueId);
      }
      return next;
    });
  }, []);

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item?: IFile | IFolder;
    parentPath?: string[];
  } | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isTreeOpen, setIsTreeOpen] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const editorRef = useRef<ICodeEditor | null>(null);
  const fileViewerRef = useRef<HTMLDivElement>(null);
  const [isCreatingRepository, setIsCreatingRepository] =
    useState<boolean>(false);
  const [isWaitingForInstallation, setIsWaitingForInstallation] =
    useState<boolean>(false);
  const [githubError, setGitHubError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportOwner, setExportOwner] = useState<string>('');
  const [exportAccessToken, setExportAccessToken] = useState<string>('');

  // GitHub App is configured via environment variables, so we don't need to check for user tokens
  // The button should be enabled as long as the user is authenticated
  const isAuth0Configured =
    !isUserLoading &&
    serverConfigStatus !== null &&
    serverConfigStatus.auth0ManagementApiConfigured === true;
  // Keep hasGitHubToken for backward compatibility with UI checks, but it's not required for GitHub App
  const hasGitHubToken =
    isAuth0Configured && githubToken !== null && githubToken !== '';

  useEffect(() => {
    if (hasGitHubToken && githubError !== null) {
      setGitHubError(null);
    }
  }, [hasGitHubToken, githubError]);

  // Detect mobile width for responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Auto-expand accordion on mobile when no file is selected
  useEffect(() => {
    if (isMobile && selectedFile === null) {
      setIsTreeOpen(true);
    }
  }, [isMobile, selectedFile]);

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
    if (activeFileId !== null && activeFileId !== '') {
      markFileEdited(activeFileId, false);
    }
  }, [
    selectedFile,
    folderStructure,
    currentPath,
    activeFileId,
    markFileEdited,
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
      if (activeFileId !== null && activeFileId !== '') {
        markFileEdited(activeFileId, false);
      }
    }
  }, [selectedFile, fetchedFileContent, activeFileId, markFileEdited]);

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
          // Update the file in openFiles array
          setOpenFiles((prev) =>
            prev.map((f) =>
              f.uniqueId === fileWithUniqueId.uniqueId ? fileWithUniqueId : f,
            ),
          );
        }
        setCurrentPath(path);
      } else {
        // File was deleted from structure, remove from open files
        setOpenFiles((prev) =>
          prev.filter((f) => f.uniqueId !== selectedFile.uniqueId),
        );
        if (activeFileId === selectedFile.uniqueId) {
          setActiveFileId(null);
        }
        setCurrentPath([]);
      }
    }
  }, [folderStructure, selectedFile, activeFileId]);

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
  const handleCloseFile = async (fileId?: string) => {
    const targetId = fileId ?? activeFileId;
    if (targetId === null || targetId === '') {
      return;
    }

    const targetFile = openFiles.find((f) => f.uniqueId === targetId);
    if (!targetFile) {
      return;
    }

    const isTargetEdited = editedFiles.has(targetId);

    if (isTargetEdited) {
      // Get user's decision about saving changes
      const result = await promptModal({
        title: 'Unsaved Changes',
        description: `Do you want to save the changes you made to ${targetFile.name}?`,
        confirmButtonText: 'Save and Close',
        denyButtonText: 'Close without Saving',
      });

      // If user chose "Save and Close"
      if (result) {
        saveFileChanges();
      }
    }

    // Close the file
    closeFile(targetId);
  };

  // Update file content and track edited state
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value ?? '';
    setFileContent(newContent);

    // Check if content is different from the saved file
    if (
      selectedFile &&
      activeFileId !== null &&
      activeFileId !== '' &&
      newContent !== selectedFile.content
    ) {
      markFileEdited(activeFileId, true);
    } else if (activeFileId !== null && activeFileId !== '') {
      markFileEdited(activeFileId, false);
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
      // Update the renamed file in openFiles
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.uniqueId === selectedFile.uniqueId ? { ...f, name: newName } : f,
        ),
      );
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
      closeFile(selectedFile.uniqueId);
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
    const folderColor = mode === 'edit' ? 'text-yellow-500' : 'text-content';
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
              <button
                type="button"
                className="flex items-center bg-transparent border-0 p-0 cursor-pointer"
                onContextMenu={(e) => {
                  handleContextMenuWithCheck(e, item, parentPath);
                }}
              >
                <FolderIcon fontSize="small" className={folderColor} />
                &nbsp;
                {item.name}
              </button>
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
            <button
              type="button"
              className="flex items-center bg-transparent border-0 p-0 cursor-pointer"
              onContextMenu={(e) => {
                handleContextMenuWithCheck(e, item, parentPath);
              }}
            >
              <CodeIcon fontSize="small" className="text-yellow-500" />
              &nbsp;
              {item.name}
            </button>
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

  /* Open the export modal to let user choose authentication method */
  const handleOpenExportModal = () => {
    void (async () => {
      try {
        const accessTokenResult = await getAccessTokenSilently({
          authorizationParams: {
            audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          },
        });
        if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
          throw new Error('Failed to get access token');
        }
        setExportAccessToken(accessTokenResult);

        /* Get GitHub username from user - try nickname first, then email prefix, or prompt */
        let githubOwner: string | null = null;
        if (user !== null) {
          if (
            typeof user.nickname === 'string' &&
            user.nickname !== '' &&
            user.nickname !== user.email
          ) {
            githubOwner = user.nickname;
          } else if (typeof user.email === 'string' && user.email !== '') {
            const emailPrefix = user.email.split('@')[0];
            if (emailPrefix !== '') {
              githubOwner = emailPrefix;
            }
          }
        }

        /* If we couldn't determine owner, prompt the user */
        if (githubOwner === null || githubOwner === '') {
          const ownerInput = await newValue({
            title:
              'GitHub Username Required\nEnter your GitHub username or organization name:',
          });
          if (ownerInput === '' || ownerInput.trim() === '') {
            return;
          }
          githubOwner = ownerInput.trim();
        }

        setExportOwner(githubOwner);
        setShowExportModal(true);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to initialize export';
        setGitHubError(message);
        openRandomModal({
          title: 'Error',
          content: <p>{message}</p>,
        });
      }
    })();
  };

  /* Save GitHub token via API */
  const saveGitHubToken = async (token: string) => {
    const response = await fetch(`${getApiUrl()}/github-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${exportAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to save token');
    }
  };

  /* Handle method selection from export modal */
  const handleExportMethodSelected = (
    method: 'personal_token' | 'github_app' | 'existing_repo',
    tokenOrRepoUrl?: string,
  ) => {
    setShowExportModal(false);
    if (
      method === 'existing_repo' &&
      tokenOrRepoUrl !== undefined &&
      tokenOrRepoUrl !== ''
    ) {
      /* Push to existing repository */
      void performExportToExistingRepo(tokenOrRepoUrl);
    } else {
      void performExport(
        exportOwner,
        method === 'existing_repo' ? 'github_app' : method,
      );
    }
  };

  /* Perform the actual export */
  const performExport = async (
    githubOwner: string,
    method: 'personal_token' | 'github_app',
  ) => {
    setIsCreatingRepository(true);

    try {
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
            Authorization: `Bearer ${exportAccessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repoName,
            description,
            isPrivate: false,
            owner: githubOwner,
            method /* Pass the selected method to the backend */,
          }),
        },
      );

      const createRepoResult: unknown = await createRepoResponse.json();

      interface ICreateRepositoryResponse {
        success?: boolean;
        message?: string;
        repoUrl?: string;
        error?: string;
        code?: string;
        installationUrl?: string;
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
            'error' in val ||
            'code' in val ||
            'installationUrl' in val)
        );
      };

      if (!createRepoResponse.ok) {
        if (
          isCreateRepositoryResponse(createRepoResult) &&
          createRepoResult.code === 'GITHUB_APP_NOT_INSTALLED' &&
          createRepoResult.installationUrl !== undefined &&
          createRepoResult.installationUrl !== ''
        ) {
          /* Open installation URL directly in new tab */
          window.open(createRepoResult.installationUrl, '_blank');

          /* Set waiting state to show user we're polling */
          setIsWaitingForInstallation(true);

          /* Poll for installation status */
          const maxPollingTime = 5 * 60 * 1000; /* 5 minutes */
          const pollInterval = 2000; /* 2 seconds */
          const startTime = Date.now();

          const checkInstallation = async (): Promise<boolean> => {
            try {
              const checkResponse = await fetch(
                `${getApiUrl()}/check-github-app-installation`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${exportAccessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    owner: githubOwner,
                  }),
                },
              );

              if (!checkResponse.ok) {
                return false;
              }

              const checkResult: unknown = await checkResponse.json();
              interface ICheckInstallationResponse {
                installed?: boolean;
                message?: string;
              }

              const isCheckInstallationResponse = (
                val: unknown,
              ): val is ICheckInstallationResponse => {
                return (
                  typeof val === 'object' &&
                  val !== null &&
                  ('installed' in val || 'message' in val)
                );
              };

              if (
                isCheckInstallationResponse(checkResult) &&
                checkResult.installed === true
              ) {
                return true;
              }

              return false;
            } catch {
              return false;
            }
          };

          /* Poll until installed or timeout */
          while (Date.now() - startTime < maxPollingTime) {
            const isInstalled = await checkInstallation();
            if (isInstalled) {
              /* Installation complete, retry the repository creation */
              break;
            }

            /* Wait before next poll */
            await new Promise((resolve) => {
              setTimeout(resolve, pollInterval);
            });
          }

          /* Check one more time before giving up */
          const finalCheck = await checkInstallation();
          setIsWaitingForInstallation(false);
          if (!finalCheck) {
            throw new Error(
              'GitHub App installation timed out. Please ensure the app is installed and try again.',
            );
          }

          /* Retry repository creation now that app is installed */
          const retryResponse = await fetch(
            `${getApiUrl()}/create-github-repository`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${exportAccessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                repoName,
                description,
                isPrivate: false,
                owner: githubOwner,
                method,
              }),
            },
          );

          if (!retryResponse.ok) {
            const retryResult: unknown = await retryResponse.json();
            const errorMessage = isCreateRepositoryResponse(retryResult)
              ? (retryResult.error ?? 'Failed to create repository')
              : 'Failed to create repository after installation';
            throw new Error(errorMessage);
          }

          const retryResult: unknown = await retryResponse.json();
          if (
            !isCreateRepositoryResponse(retryResult) ||
            retryResult.repoUrl === undefined ||
            retryResult.repoUrl === ''
          ) {
            throw new Error('Failed to get repository URL after installation');
          }

          /* Continue with the rest of the flow using retryResult */
          const repoUrl = retryResult.repoUrl;
          const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
          const match = githubRegex.exec(repoUrl);

          if (match?.length !== 3) {
            throw new Error('Invalid repository URL format');
          }

          const repoOwner = match[1];
          const repo = match[2];

          /* Continue with file upload (skip the duplicate repo creation check) */
          /* Security check: Detect USE_USER_ENV usage before committing to GitHub */
          const userEnvDetection = detectUserEnvInStructure(folderStructure);
          if (userEnvDetection.hasUserEnv) {
            const fileList = userEnvDetection.locations
              .map((loc) => `  - ${loc.filePath}`)
              .join('\n');
            throw new Error(
              `Cannot commit to GitHub: USE_USER_ENV detected in generated files. This would expose your secrets.\n\n` +
                `Found in:\n${fileList}\n\n` +
                `Options:\n` +
                `1. Remove USE_USER_ENV from templates and use placeholders (e.g., \${KEY_NAME} or process.env.KEY_NAME)\n` +
                `2. Download files locally instead (USE_USER_ENV works for local files)\n` +
                `3. Use environment variable references in code (process.env.KEY_NAME)`,
            );
          }

          const uploadResponse = await fetch(
            `${getApiUrl()}/create-github-folder-structure`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${exportAccessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                structure: folderStructure,
                owner: repoOwner,
                repo,
                branch: 'main',
                projectName,
                method /* Pass the auth method */,
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
                      aria-label="Success icon"
                    >
                      <title>Success</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                      Export Complete
                    </h3>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {filesCreated > 0
                      ? `Successfully exported ${String(filesCreated)} file(s) to GitHub.`
                      : 'Repository created successfully.'}
                  </p>
                </div>

                <div>
                  <div className="block text-sm font-medium text-content-muted mb-2">
                    Clone Command
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-bg-muted text-content rounded-lg font-mono text-sm break-all">
                      {cloneCommand}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(cloneCommand);
                      }}
                      className="flex-shrink-0 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                      title="Copy clone command"
                    >
                      <CopyIcon fontSize="small" />
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="block text-sm font-medium text-content-muted mb-2">
                    Repository
                  </div>
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-bg-muted hover:bg-secondary-hover text-accent rounded-lg transition-colors duration-200 font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-label="GitHub icon"
                    >
                      <title>GitHub</title>
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
            ),
          });

          setIsCreatingRepository(false);
          return;
        }

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

      const repoOwner2 = match[1];
      const repo = match[2];

      /* Security check: Detect USE_USER_ENV usage before committing to GitHub */
      const userEnvDetection = detectUserEnvInStructure(folderStructure);
      if (userEnvDetection.hasUserEnv) {
        const fileList = userEnvDetection.locations
          .map((loc) => `  - ${loc.filePath}`)
          .join('\n');
        throw new Error(
          `Cannot commit to GitHub: USE_USER_ENV detected in generated files. This would expose your secrets.\n\n` +
            `Found in:\n${fileList}\n\n` +
            `Options:\n` +
            `1. Remove USE_USER_ENV from templates and use placeholders (e.g., \${KEY_NAME} or process.env.KEY_NAME)\n` +
            `2. Download files locally instead (USE_USER_ENV works for local files)\n` +
            `3. Use environment variable references in code (process.env.KEY_NAME)`,
        );
      }

      const uploadResponse = await fetch(
        `${getApiUrl()}/create-github-folder-structure`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${exportAccessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            structure: folderStructure,
            owner: repoOwner2,
            repo,
            branch: 'main',
            projectName,
            method /* Pass the auth method */,
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
                  aria-label="Success icon"
                >
                  <title>Success</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  Successfully exported {String(filesCreated)} file(s) to GitHub
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="block text-sm font-medium text-content-muted mb-2">
                  Clone Repository
                </div>
                <div className="flex items-center gap-2 bg-surface-raised border border-layout-border rounded-lg p-3">
                  <code className="flex-1 text-sm text-content font-mono break-all">
                    {cloneCommand}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy(cloneCommand);
                    }}
                    className="flex-shrink-0 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                    title="Copy clone command"
                  >
                    <CopyIcon fontSize="small" />
                    <span className="text-sm">Copy</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="block text-sm font-medium text-content-muted mb-2">
                  Repository
                </div>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-bg-muted hover:bg-secondary-hover text-accent rounded-lg transition-colors duration-200 font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="GitHub icon"
                  >
                    <title>GitHub</title>
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

            <div className="flex justify-end pt-4 border-t border-layout-border">
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
                className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        ),
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          !error.message.includes('GitHub token not found') &&
          !error.message.includes('Auth0 Management API')
        ) {
          setGitHubError(error.message);
          await promptModal({
            title: 'Error',
            description: `Failed to export project: ${error.message}`,
            confirmButtonText: 'OK',
            denyButtonText: '',
          });
        }
      } else {
        const errorMessage = 'An unexpected error occurred';
        setGitHubError(errorMessage);
        await promptModal({
          title: 'Error',
          description: errorMessage,
          confirmButtonText: 'OK',
          denyButtonText: '',
        });
      }
    } finally {
      setIsCreatingRepository(false);
    }
  };

  /* Push to an existing repository (using GitHub App) */
  const performExportToExistingRepo = async (repoUrl: string) => {
    setIsCreatingRepository(true);

    try {
      /* Parse the repo URL */
      const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
      const match = githubRegex.exec(repoUrl);

      if (match?.length !== 3) {
        throw new Error(
          'Invalid GitHub repository URL. Expected format: https://github.com/owner/repo',
        );
      }

      const repoOwner = match[1];
      const repo = match[2].replace(
        /\.git$/,
        '',
      ); /* Remove .git suffix if present */

      /* Security check: Detect USE_USER_ENV usage before committing to GitHub */
      const userEnvDetection = detectUserEnvInStructure(folderStructure);
      if (userEnvDetection.hasUserEnv) {
        const fileList = userEnvDetection.locations
          .map((loc) => `  - ${loc.filePath}`)
          .join('\n');
        throw new Error(
          `Cannot commit to GitHub: USE_USER_ENV detected in generated files. This would expose your secrets.\n\n` +
            `Found in:\n${fileList}\n\n` +
            `Options:\n` +
            `1. Remove USE_USER_ENV from templates and use placeholders (e.g., \${KEY_NAME} or process.env.KEY_NAME)\n` +
            `2. Download files locally instead (USE_USER_ENV works for local files)\n` +
            `3. Use environment variable references in code (process.env.KEY_NAME)`,
        );
      }

      /* Upload files to the existing repo using GitHub App */
      const uploadResponse = await fetch(
        `${getApiUrl()}/create-github-folder-structure`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${exportAccessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            structure: folderStructure,
            owner: repoOwner,
            repo,
            branch: 'main',
            projectName,
            method:
              'github_app' /* Always use GitHub App for existing repo flow */,
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
        title: 'Files Pushed Successfully',
        content: (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Success icon"
                >
                  <title>Success</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  Successfully pushed {String(filesCreated)} file(s) to
                  repository
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="block text-sm font-medium text-content-muted mb-2">
                  Clone Repository
                </div>
                <div className="flex items-center gap-2 bg-surface-raised border border-layout-border rounded-lg p-3">
                  <code className="flex-1 text-sm text-content font-mono break-all">
                    {cloneCommand}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy(cloneCommand);
                    }}
                    className="flex-shrink-0 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors duration-200 flex items-center gap-2"
                    title="Copy clone command"
                  >
                    <CopyIcon fontSize="small" />
                    <span className="text-sm">Copy</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="block text-sm font-medium text-content-muted mb-2">
                  Repository
                </div>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-bg-muted hover:bg-secondary-hover text-accent rounded-lg transition-colors duration-200 font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="GitHub icon"
                  >
                    <title>GitHub</title>
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

            <div className="flex justify-end pt-4 border-t border-layout-border">
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
                className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        ),
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setGitHubError(error.message);
        await promptModal({
          title: 'Error',
          description: `Failed to push to repository: ${error.message}`,
          confirmButtonText: 'OK',
          denyButtonText: '',
        });
      } else {
        const errorMessage = 'An unexpected error occurred';
        setGitHubError(errorMessage);
        await promptModal({
          title: 'Error',
          description: errorMessage,
          confirmButtonText: 'OK',
          denyButtonText: '',
        });
      }
    } finally {
      setIsCreatingRepository(false);
    }
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
          userMetadata: decryptedMetadata ?? userMetadata ?? null,
        }),
      });

      const data: unknown = await response.json();

      if (
        data !== null &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === true
      ) {
        /*prettier-ignore*/ (($ = "Success!") => {
					const isObject = (obj: unknown): obj is Record<string, unknown> => {
						return obj !== null && typeof obj === "object";
					};
					const isArrayOfObjects = (
						arr: unknown,
					): arr is Record<string, unknown>[] => {
						return Array.isArray(arr) && arr.every(isObject);
					};
					const parentDiv: HTMLElement =
						document.getElementById("quicklogContainer") ??
						(() => {
							const div = document.createElement("div");
							div.id = "quicklogContainer";
							div.style.cssText =
								"position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;";
							const helperButtonsDiv = document.createElement("div");
							helperButtonsDiv.style.cssText =
								"position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;";
							const clearButton = document.createElement("button");
							clearButton.textContent = "Clear";
							clearButton.style.cssText =
								"margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;";
							clearButton.onclick = () => {
								if (parentDiv instanceof HTMLElement) {
									parentDiv.remove();
								}
							};
							helperButtonsDiv.appendChild(clearButton);
							document.body.appendChild(div);
							div.appendChild(helperButtonsDiv);
							return div;
						})();
					const createTable = (
						obj: Record<string, unknown>,
					): HTMLTableElement => {
						const table = document.createElement("table");
						table.style.cssText =
							'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
						Object.entries(obj).forEach(([key, value]) => {
							const row = document.createElement("tr");
							const keyCell = document.createElement("td");
							const valueCell = document.createElement("td");
							keyCell.textContent = key;
							valueCell.textContent = String(value);
							keyCell.style.cssText = "border: 1px solid black; padding: 5px;";
							valueCell.style.cssText =
								"border: 1px solid black; padding: 5px;";
							row.appendChild(keyCell);
							row.appendChild(valueCell);
							table.appendChild(row);
						});
						return table;
					};
					const createTableFromArray = (
						arr: Record<string, unknown>[],
					): HTMLTableElement => {
						const table = document.createElement("table");
						table.style.cssText =
							'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
						const headers = Object.keys(arr[0]);
						const headerRow = document.createElement("tr");
						headers.forEach((header) => {
							const th = document.createElement("th");
							th.textContent = header;
							th.style.cssText = "border: 1px solid black; padding: 5px;";
							headerRow.appendChild(th);
						});
						table.appendChild(headerRow);
						arr.forEach((obj) => {
							const row = document.createElement("tr");
							headers.forEach((header) => {
								const td = document.createElement("td");
								td.textContent = String(obj[header]);
								td.style.cssText = "border: 1px solid black; padding: 5px;";
								row.appendChild(td);
							});
							table.appendChild(row);
						});
						return table;
					};
					const createChildDiv = (data: unknown): HTMLElement => {
						const newDiv = document.createElement("div");
						const jsonData = JSON.stringify(data, null, 2);
						if (isArrayOfObjects(data)) {
							const table = createTableFromArray(data);
							newDiv.appendChild(table);
						} else if (isObject(data)) {
							const table = createTable(data);
							newDiv.appendChild(table);
						} else {
							newDiv.textContent = String(data);
						}
						newDiv.style.cssText =
							'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;';
						const handleMouseDown = (e: MouseEvent) => {
							e.preventDefault();
							const clickedDiv =
								e.target instanceof Element && e.target.closest("div");
							if (
								clickedDiv !== null &&
								e.button === 0 &&
								clickedDiv === newDiv
							) {
								void navigator.clipboard.writeText(jsonData).then(() => {
									clickedDiv.style.backgroundColor = "gold";
									setTimeout(() => {
										clickedDiv.style.backgroundColor = "yellow";
									}, 1000);
								});
							}
						};
						const handleRightClick = (e: MouseEvent) => {
							e.preventDefault();
							if (parentDiv.contains(newDiv)) {
								parentDiv.removeChild(newDiv);
								if (!parentDiv.hasChildNodes()) {
									parentDiv.remove();
								}
							}
						};
						newDiv.addEventListener("mousedown", handleMouseDown);
						newDiv.addEventListener("contextmenu", handleRightClick);
						return newDiv;
					};
					parentDiv.prepend(createChildDiv($));
				})();
      } else {
        /*prettier-ignore*/ (($ = "Fail!") => {
					const isObject = (obj: unknown): obj is Record<string, unknown> => {
						return obj !== null && typeof obj === "object";
					};
					const isArrayOfObjects = (
						arr: unknown,
					): arr is Record<string, unknown>[] => {
						return Array.isArray(arr) && arr.every(isObject);
					};
					const parentDiv: HTMLElement =
						document.getElementById("quicklogContainer") ??
						(() => {
							const div = document.createElement("div");
							div.id = "quicklogContainer";
							div.style.cssText =
								"position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;";
							const helperButtonsDiv = document.createElement("div");
							helperButtonsDiv.style.cssText =
								"position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;";
							const clearButton = document.createElement("button");
							clearButton.textContent = "Clear";
							clearButton.style.cssText =
								"margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;";
							clearButton.onclick = () => {
								if (parentDiv instanceof HTMLElement) {
									parentDiv.remove();
								}
							};
							helperButtonsDiv.appendChild(clearButton);
							document.body.appendChild(div);
							div.appendChild(helperButtonsDiv);
							return div;
						})();
					const createTable = (
						obj: Record<string, unknown>,
					): HTMLTableElement => {
						const table = document.createElement("table");
						table.style.cssText =
							'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
						Object.entries(obj).forEach(([key, value]) => {
							const row = document.createElement("tr");
							const keyCell = document.createElement("td");
							const valueCell = document.createElement("td");
							keyCell.textContent = key;
							valueCell.textContent = String(value);
							keyCell.style.cssText = "border: 1px solid black; padding: 5px;";
							valueCell.style.cssText =
								"border: 1px solid black; padding: 5px;";
							row.appendChild(keyCell);
							row.appendChild(valueCell);
							table.appendChild(row);
						});
						return table;
					};
					const createTableFromArray = (
						arr: Record<string, unknown>[],
					): HTMLTableElement => {
						const table = document.createElement("table");
						table.style.cssText =
							'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
						const headers = Object.keys(arr[0]);
						const headerRow = document.createElement("tr");
						headers.forEach((header) => {
							const th = document.createElement("th");
							th.textContent = header;
							th.style.cssText = "border: 1px solid black; padding: 5px;";
							headerRow.appendChild(th);
						});
						table.appendChild(headerRow);
						arr.forEach((obj) => {
							const row = document.createElement("tr");
							headers.forEach((header) => {
								const td = document.createElement("td");
								td.textContent = String(obj[header]);
								td.style.cssText = "border: 1px solid black; padding: 5px;";
								row.appendChild(td);
							});
							table.appendChild(row);
						});
						return table;
					};
					const createChildDiv = (data: unknown): HTMLElement => {
						const newDiv = document.createElement("div");
						const jsonData = JSON.stringify(data, null, 2);
						if (isArrayOfObjects(data)) {
							const table = createTableFromArray(data);
							newDiv.appendChild(table);
						} else if (isObject(data)) {
							const table = createTable(data);
							newDiv.appendChild(table);
						} else {
							newDiv.textContent = String(data);
						}
						newDiv.style.cssText =
							'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;';
						const handleMouseDown = (e: MouseEvent) => {
							e.preventDefault();
							const clickedDiv =
								e.target instanceof Element && e.target.closest("div");
							if (
								clickedDiv !== null &&
								e.button === 0 &&
								clickedDiv === newDiv
							) {
								void navigator.clipboard.writeText(jsonData).then(() => {
									clickedDiv.style.backgroundColor = "gold";
									setTimeout(() => {
										clickedDiv.style.backgroundColor = "yellow";
									}, 1000);
								});
							}
						};
						const handleRightClick = (e: MouseEvent) => {
							e.preventDefault();
							if (parentDiv.contains(newDiv)) {
								parentDiv.removeChild(newDiv);
								if (!parentDiv.hasChildNodes()) {
									parentDiv.remove();
								}
							}
						};
						newDiv.addEventListener("mousedown", handleMouseDown);
						newDiv.addEventListener("contextmenu", handleRightClick);
						return newDiv;
					};
					parentDiv.prepend(createChildDiv($));
				})();
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

  const getButtonTooltip = (): string | undefined => {
    if (!hasGitHubToken) {
      return 'GitHub token required. Click your profile to add one.';
    }
    if (safeFilesUsingUserEnv.length > 0) {
      return 'Cannot export: USE_USER_ENV detected in files';
    }
    if (folderStructure.length === 0) {
      return 'No files to export';
    }
    return undefined;
  };

  return (
    <div className="h-full flex flex-col" ref={fileViewerRef}>
      {githubError !== null && githubError !== '' && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-red-200">{githubError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGitHubError(null);
              }}
              className="text-red-400 hover:text-red-300 transition-colors"
              aria-label="Dismiss error"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!isUserLoading &&
        serverConfigStatus !== null &&
        !hasGitHubToken &&
        isAuth0Configured && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-md mb-2 w-fit">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-300">
                  GitHub Token Required
                </p>
                <p className="text-xs text-yellow-200/80 mt-1 mb-2">
                  A GitHub Personal Access Token is required to create
                  repositories and files. Add your token to enable GitHub
                  operations.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      openUserProfile('githubToken');
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
                  >
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add GitHub Token
                  </button>
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-yellow-300 hover:text-yellow-200 underline"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                    Create Token on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Main content area - flex to fill remaining space */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 text-white overflow-hidden">
        {/* Mobile: Accordion file explorer */}
        {isMobile && (
          <div className="flex flex-col shrink-0">
            {/* Accordion header - always visible on mobile */}
            <button
              type="button"
              onClick={() => {
                setIsTreeOpen(!isTreeOpen);
              }}
              className="flex items-center justify-center gap-2 bg-panel px-3 py-2"
            >
              <span className="text-sm font-medium text-content">
                {isTreeOpen ? 'Hide Files' : 'View Files'}
              </span>
              <svg
                className={`w-4 h-4 text-content-muted transition-transform ${isTreeOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Toggle</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Accordion panel - partial height to show editor below */}
            <div
              className={`max-h-[66vh] bg-panel flex flex-col overflow-hidden ${isTreeOpen ? '' : 'hidden'}`}
            >
              {/* Action buttons toolbar */}
              {mode === 'edit' && (
                <div className="p-3 border-b border-layout-border space-y-3 shrink-0">
                  {/* Primary actions row */}
                  <div className="flex gap-2">
                    {process.env.NODE_ENV === 'development' && (
                      <button
                        type="button"
                        onClick={() => void handleCreateApp()}
                        className="btn-primary flex-1"
                      >
                        Create App
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenExportModal}
                      disabled={
                        isCreatingRepository ||
                        isWaitingForInstallation ||
                        folderStructure.length === 0 ||
                        safeFilesUsingUserEnv.length > 0
                      }
                      className={`btn-primary flex-1 ${
                        isCreatingRepository ||
                        isWaitingForInstallation ||
                        folderStructure.length === 0 ||
                        safeFilesUsingUserEnv.length > 0
                          ? 'opacity-50'
                          : ''
                      }`}
                      title={getButtonTooltip()}
                    >
                      {isWaitingForInstallation
                        ? 'Installing...'
                        : isCreatingRepository
                          ? 'Exporting...'
                          : `Export (${String(countFiles(folderStructure))})`}
                    </button>
                  </div>

                  {/* Secondary actions row */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        zipAndDownloadIStructure(
                          folderStructure,
                          getZipFileName(),
                        );
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-secondary text-fg hover:bg-secondary-hover transition-colors flex items-center justify-center gap-1.5"
                      title="Download ZIP"
                    >
                      <DownloadIcon sx={{ fontSize: 16 }} />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFile');
                        })();
                      }}
                      className="p-2 bg-secondary text-fg hover:bg-secondary-hover transition-colors"
                      title="New File"
                      aria-label="New File"
                    >
                      <NoteAddIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFolder');
                        })();
                      }}
                      className="p-2 bg-secondary text-fg hover:bg-secondary-hover transition-colors"
                      title="New Folder"
                      aria-label="New Folder"
                    >
                      <CreateNewFolderIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>

                  {/* Dev copy buttons row */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleCopy(JSON.stringify(userFiles, null, 4));
                        }}
                        className="flex-1 text-xs px-3 py-2 bg-bg-muted text-content hover:bg-secondary-hover transition-colors"
                      >
                        Copy User Files
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopy(JSON.stringify(folderStructure, null, 4));
                        }}
                        className="flex-1 text-xs px-3 py-2 bg-bg-muted text-content hover:bg-secondary-hover transition-colors"
                      >
                        Copy Structure
                      </button>
                    </div>
                  )}

                  {/* Project selector row */}
                  {projects.length > 0 &&
                    selectedProjectProp &&
                    onProjectChange && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-content-muted shrink-0">
                          Project:
                        </span>
                        <select
                          value={selectedProjectProp.name}
                          onChange={onProjectChange}
                          className="flex-1 text-xs bg-bg-muted text-content border border-layout-border px-2 py-2 focus:outline-none focus:ring-1 focus:ring-accent [&_option:checked]:bg-gray-600 [&_option:hover]:bg-gray-600"
                        >
                          {projects.map((project) => (
                            <option
                              key={project.name}
                              value={project.name}
                              className="bg-bg-muted checked:bg-gray-600 hover:bg-gray-600"
                            >
                              {project.name.replace('App Generator - ', '')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  {/* Warning banners */}
                  {safeFilesUsingUserEnv.length > 0 && (
                    <div className="p-3 bg-orange-900/30 border border-orange-700 rounded-md">
                      <div className="flex flex-col items-center gap-3">
                        <svg
                          className="w-6 h-6 text-orange-400 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="flex-1 min-w-0 text-center">
                          <p className="text-xs font-medium text-orange-300 mb-1">
                            Security Warning: Secrets Detected
                          </p>
                          <p className="text-xs text-orange-200/80 mb-2">
                            {safeFilesUsingUserEnv.length} file(s) contain
                            sensitive data. Exporting to GitHub will leak your
                            secrets (API keys, passwords, tokens, etc.).
                          </p>
                          <ul className="text-xs text-orange-200/80 list-disc list-inside mb-2 space-y-1">
                            {safeFilesUsingUserEnv.map((filePath: string) => (
                              <li key={filePath} className="font-mono">
                                {filePath}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-orange-200/70">
                            <button
                              type="button"
                              onClick={() => {
                                zipAndDownloadIStructure(
                                  folderStructure,
                                  getZipFileName(),
                                );
                              }}
                              className="text-orange-300 hover:text-orange-200 underline font-medium"
                            >
                              Download ZIP
                            </button>{' '}
                            instead or use placeholders.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {filesFailedToFormat.length > 0 && (
                    <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-yellow-300 mb-1">
                            Formatting Failed
                          </p>
                          <p className="text-xs text-yellow-200/80 mb-2">
                            {filesFailedToFormat.length} file(s) could not be
                            formatted due to syntax errors in the generated
                            code.
                          </p>
                          <ul className="text-xs text-yellow-200/80 list-disc list-inside mb-2 space-y-1">
                            {filesFailedToFormat
                              .filter((entry): entry is IFailedFormatEntry => {
                                if (typeof entry === 'string') {
                                  return false;
                                }
                                return (
                                  typeof entry === 'object' &&
                                  'filePath' in entry &&
                                  'errorMessage' in entry
                                );
                              })
                              .map((entry) => {
                                const { filePath, errorMessage } = entry;
                                return (
                                  <li key={filePath}>
                                    <span className="font-mono">
                                      {filePath}
                                    </span>{' '}
                                    -{' '}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openModal(
                                          'format-error-modal',
                                          'Format Error Details',

                                          <div className="space-y-4">
                                            <div>
                                              <p className="text-sm font-medium text-content-muted mb-2">
                                                File:
                                              </p>
                                              <code className="block p-2 bg-bg-muted rounded text-xs text-content break-all">
                                                {filePath}
                                              </code>
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium text-content-muted mb-2">
                                                Error Message:
                                              </p>
                                              <pre className="p-3 bg-bg-muted rounded text-xs text-red-300 whitespace-pre-wrap break-words overflow-auto max-h-96">
                                                {errorMessage}
                                              </pre>
                                            </div>
                                            <p className="text-xs text-content-subtle">
                                              Fix the syntax error in your
                                              template and regenerate the
                                              project.
                                            </p>
                                          </div>,
                                        );
                                      }}
                                      className="text-yellow-300 hover:text-yellow-200 underline font-medium text-xs"
                                    >
                                      View error
                                    </button>
                                  </li>
                                );
                              })}
                          </ul>
                          <p className="text-xs text-yellow-200/70">
                            Check your templates for syntax errors.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* File tree */}
              <div
                className="flex-1 min-h-0 overflow-auto p-2 scrollbar-thin"
                onContextMenu={(e) => {
                  if (mode === 'edit') {
                    handleContextMenu(e);
                  }
                }}
              >
                <div className="min-w-max pb-2">
                  <SimpleTreeView>
                    {renderTree(folderStructure, openFile)}
                  </SimpleTreeView>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop: Side-by-side file tree panel - fixed width with horizontal scroll */}
        {!isMobile && (
          <div className="w-64 bg-panel select-none flex flex-col shrink-0 overflow-hidden border-r border-layout-border">
            {/* File tree toolbar */}
            {mode === 'edit' && (
              <div className="p-2 border-b border-layout-border space-y-2 shrink-0">
                {/* Dev copy buttons */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(JSON.stringify(userFiles, null, 4));
                      }}
                      className="btn-secondary flex-1"
                    >
                      Copy Files
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(JSON.stringify(folderStructure, null, 4));
                      }}
                      className="btn-secondary flex-1"
                    >
                      Copy Structure
                    </button>
                  </div>
                )}
                {/* File actions row */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await handleOpenDialog('newFile');
                      })();
                    }}
                    className="btn-secondary btn-icon flex-1"
                    title="New File"
                  >
                    <NoteAddIcon sx={{ fontSize: 14 }} />
                    <span>New File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await handleOpenDialog('newFolder');
                      })();
                    }}
                    className="btn-secondary btn-icon flex-1"
                    title="New Folder"
                  >
                    <CreateNewFolderIcon sx={{ fontSize: 14 }} />
                    <span>New Folder</span>
                  </button>
                </div>
                {/* Project selector */}
                {projects.length > 0 &&
                  selectedProjectProp &&
                  onProjectChange && (
                    <div className="space-y-1">
                      <span className="text-xs text-content-muted block text-center">
                        Project:
                      </span>
                      <select
                        value={selectedProjectProp.name}
                        onChange={onProjectChange}
                        className="w-full text-xs bg-secondary text-content-muted border border-layout-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent [&_option:checked]:bg-gray-600 [&_option:hover]:bg-gray-600"
                      >
                        {projects.map((project) => (
                          <option
                            key={project.name}
                            value={project.name}
                            className="bg-bg-muted checked:bg-gray-600 hover:bg-gray-600"
                          >
                            {project.name.replace('App Generator - ', '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>
            )}
            {/* File tree */}
            <div
              className="flex-1 min-h-0 overflow-auto p-2 scrollbar-thin"
              onContextMenu={(e) => {
                if (mode === 'edit') {
                  handleContextMenu(e);
                }
              }}
            >
              <div className="min-w-max pb-2">
                <SimpleTreeView>
                  {renderTree(folderStructure, openFile)}
                </SimpleTreeView>
              </div>
            </div>
          </div>
        )}

        {/* Editor panel - takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface overflow-hidden md:border-t-0 border-t border-layout-border">
          {/* Tab bar for open files */}
          {openFiles.length > 0 && (
            <div className="flex items-center bg-panel border-b border-layout-border overflow-x-auto">
              <div className="flex">
                {openFiles.map((file) => {
                  const isActive = file.uniqueId === activeFileId;
                  const isEdited = editedFiles.has(file.uniqueId);
                  return (
                    <div
                      key={file.uniqueId}
                      className={`group flex items-center gap-3 px-4 py-2 border-r border-layout-border cursor-pointer text-sm ${
                        isActive
                          ? 'text-content'
                          : 'bg-panel text-content-muted hover:bg-secondary-hover hover:text-content'
                      }`}
                      style={
                        isActive
                          ? { backgroundColor: 'var(--btn-secondary-bg)' }
                          : undefined
                      }
                      onClick={() => {
                        setActiveFileId(file.uniqueId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveFileId(file.uniqueId);
                        }
                      }}
                      role="tab"
                      tabIndex={0}
                      aria-selected={isActive}
                    >
                      <span className="truncate max-w-32">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCloseFile(file.uniqueId);
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover transition-colors ${
                          isEdited
                            ? 'text-white'
                            : 'text-content-subtle hover:text-white'
                        }`}
                        title="Close"
                      >
                        {isEdited ? (
                          <span className="w-3 h-3 flex items-center justify-center text-xs">
                            ●
                          </span>
                        ) : (
                          <CloseIcon sx={{ fontSize: 14 }} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* Actions for active file */}
              {selectedFile && (
                <div className="flex items-center gap-1 ml-auto px-2">
                  {mode === 'edit' && isFileEdited && (
                    <button
                      type="button"
                      onClick={saveFileChanges}
                      className="hover:bg-secondary-hover text-content p-1 rounded transition-colors"
                      title="Save"
                    >
                      <SaveIcon fontSize="small" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFile.content) {
                        handleCopy(selectedFile.content);
                      }
                    }}
                    disabled={!selectedFile.content}
                    className="hover:bg-secondary-hover text-content p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Copy"
                  >
                    <CopyIcon fontSize="small" />
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedFile ? (
            <>
              <div className="flex-1 min-h-0">
                {isFileContentLoading ? (
                  <div className="flex items-center justify-center h-full bg-surface p-4">
                    <div className="text-content">Loading file content...</div>
                  </div>
                ) : fileContentError ? (
                  <div className="flex items-center justify-center h-full bg-surface p-4">
                    <div className="text-red-400">
                      Error loading file:{' '}
                      {fileContentError instanceof Error
                        ? fileContentError.message
                        : 'Unknown error'}
                    </div>
                  </div>
                ) : isImageFile(selectedFile.name) && fileContent ? (
                  <div className="flex items-center justify-center h-full bg-surface p-4">
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
                    height="100%"
                    defaultValue={selectedFile.content}
                    value={fileContent}
                    beforeMount={(monaco) => {
                      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                        {
                          noSemanticValidation: true,
                          noSyntaxValidation: false,
                        },
                      );
                    }}
                    language={(() => {
                      const fileExtension: string | undefined =
                        selectedFile.name.split('.').pop();
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
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                    }}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-content-subtle">
              <p>Select a file to view</p>
            </div>
          )}
        </div>

        {/* Right panel - Export/Download actions (Desktop only) */}
        {!isMobile && mode === 'edit' && (
          <div className="w-56 bg-panel select-none flex flex-col shrink-0 overflow-hidden border-l border-layout-border">
            <div className="p-3 space-y-3">
              {/* Section header */}
              <h3 className="text-xs font-medium text-content-muted uppercase tracking-wide">
                Actions
              </h3>

              {/* Create App - Dev only */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={() => void handleCreateApp()}
                  className="btn-primary w-full"
                >
                  Create App
                </button>
              )}

              {/* Export to GitHub */}
              <button
                type="button"
                onClick={handleOpenExportModal}
                disabled={
                  isCreatingRepository ||
                  isWaitingForInstallation ||
                  folderStructure.length === 0 ||
                  safeFilesUsingUserEnv.length > 0
                }
                className={`btn-primary btn-full ${
                  isCreatingRepository ||
                  isWaitingForInstallation ||
                  folderStructure.length === 0 ||
                  safeFilesUsingUserEnv.length > 0
                    ? 'opacity-50'
                    : ''
                }`}
                title={getButtonTooltip()}
              >
                {isWaitingForInstallation
                  ? 'Installing...'
                  : isCreatingRepository
                    ? 'Exporting...'
                    : `Export (${String(countFiles(folderStructure))})`}
              </button>

              {/* Download ZIP */}
              <button
                type="button"
                onClick={() => {
                  zipAndDownloadIStructure(folderStructure, getZipFileName());
                }}
                className="btn-secondary btn-full btn-icon"
                title="Download ZIP"
              >
                <DownloadIcon sx={{ fontSize: 16 }} />
                <span>Download ZIP</span>
              </button>

              {/* Warning banners */}
              {safeFilesUsingUserEnv.length > 0 && (
                <div className="p-3 bg-orange-900/30 border border-orange-700 rounded-md">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-6 h-6 text-orange-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1 min-w-0 text-center">
                      <p className="text-xs font-medium text-orange-300 mb-1">
                        Security Warning: Secrets Detected
                      </p>
                      <p className="text-xs text-orange-200/80 mb-2">
                        {safeFilesUsingUserEnv.length} file(s) contain sensitive
                        data. Exporting to GitHub will leak your secrets (API
                        keys, passwords, tokens, etc.).
                      </p>
                      <ul className="text-xs text-orange-200/80 list-disc list-inside mb-2 space-y-1">
                        {safeFilesUsingUserEnv.map((filePath: string) => (
                          <li key={filePath} className="font-mono">
                            {filePath}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-orange-200/70">
                        <button
                          type="button"
                          onClick={() => {
                            zipAndDownloadIStructure(
                              folderStructure,
                              getZipFileName(),
                            );
                          }}
                          className="text-orange-300 hover:text-orange-200 underline font-medium"
                        >
                          Download ZIP
                        </button>{' '}
                        instead or use placeholders.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {filesFailedToFormat.length > 0 && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-yellow-300 mb-1">
                        Formatting Failed
                      </p>
                      <p className="text-xs text-yellow-200/80 mb-2">
                        {filesFailedToFormat.length} file(s) could not be
                        formatted due to syntax errors in the generated code.
                      </p>
                      <ul className="text-xs text-yellow-200/80 list-disc list-inside mb-2 space-y-1">
                        {filesFailedToFormat
                          .filter((entry): entry is IFailedFormatEntry => {
                            if (typeof entry === 'string') {
                              return false;
                            }
                            return (
                              typeof entry === 'object' &&
                              'filePath' in entry &&
                              'errorMessage' in entry
                            );
                          })
                          .map((entry) => {
                            const { filePath, errorMessage } = entry;
                            return (
                              <li key={filePath}>
                                <span className="font-mono">{filePath}</span> -{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    openModal(
                                      'format-error-modal',
                                      'Format Error Details',

                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-sm font-medium text-content-muted mb-2">
                                            File:
                                          </p>
                                          <code className="block p-2 bg-bg-muted rounded text-xs text-content break-all">
                                            {filePath}
                                          </code>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-content-muted mb-2">
                                            Error Message:
                                          </p>
                                          <pre className="p-3 bg-bg-muted rounded text-xs text-red-300 whitespace-pre-wrap break-words overflow-auto max-h-96">
                                            {errorMessage}
                                          </pre>
                                        </div>
                                        <p className="text-xs text-content-subtle">
                                          Fix the syntax error in your template
                                          and regenerate the project.
                                        </p>
                                      </div>,
                                    );
                                  }}
                                  className="text-yellow-300 hover:text-yellow-200 underline font-medium text-xs"
                                >
                                  View error
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                      <p className="text-xs text-yellow-200/70">
                        Check your templates for syntax errors.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
      <GitHubExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
        }}
        owner={exportOwner}
        accessToken={exportAccessToken}
        onSelectMethod={handleExportMethodSelected}
        onSaveToken={saveGitHubToken}
      />
    </div>
  );
}

export default FileViewer;
