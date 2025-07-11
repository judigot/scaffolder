import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { handleCopy } from '@/helpers/stringHelper.ts';
import Editor, { OnMount } from '@monaco-editor/react';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import ContextMenu from '@/components/UI/ContextMenu.tsx';
import zipAndDownloadIStructure from '@/utils/zipIStructure.ts';
import { useFormStore } from '@/useFormStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';

export interface IBase {
  name: string;
  type: 'file' | 'folder';
}

export interface IFile extends IBase {
  type: 'file';
  content: string;
  uniqueId?: string; // Full path to uniquely identify the file
}

export interface IFolder extends IBase {
  type: 'folder';
  children: (IFile | IFolder)[];
}

export type IStructure = (IFile | IFolder)[];

// Define a type for the editor
interface ICodeEditor {
  getValue(): string;
}

// Helper function to create a unique file identifier
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
  const { schemaInfo, SQLSchema } = useTransformationsStore();
  const { backendDir, publicRepoURL, dbConnection } = useFormStore();
  const { editValue, newValue, promptModal } = useModalStore();
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
        trueText: 'Save and Close',
        falseText: 'Close without Saving',
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
      contextMenu?.item &&
      contextMenu.item.type === 'folder'
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
      trueText: 'Delete',
      falseText: 'Cancel',
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
    return items.map((item, index) => {
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
            // Create a file with uniqueId and pass it to the onSelectFile callback
            const fileWithUniqueId = {
              ...item,
              uniqueId,
            };
            onSelectFile(fileWithUniqueId);
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
      const response = await fetch(`${String(import.meta.env.VITE_BACKEND_URL)}/create-local-files`, {
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
        trueText: 'OK',
        falseText: '',
      });
    }
  };

  return (
    <div className="h-96 p-2" ref={fileViewerRef}>
      <button
        type="button"
        onClick={() => void handleCreateApp()}
        className="mb-2 sm:mr-2 text-xs h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
      >
        Create App!
      </button>
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
                      handleCopy(selectedFile.content);
                    }}
                    className="hover:bg-gray-700 text-white px-2 py-1 rounded float-right"
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
              <Editor
                // className="max-h-96"
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
                    java: 'java',
                    sql: 'sql',
                    txt: 'plaintext',
                    jsx: 'javascript',
                    tsx: 'typescript',
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
                      if (
                        contextMenu.item &&
                        contextMenu.item.type === 'folder'
                      ) {
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
                      if (
                        contextMenu.item &&
                        contextMenu.item.type === 'folder'
                      ) {
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
                            return folderCandidate &&
                              folderCandidate.type === 'folder'
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
