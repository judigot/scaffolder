import { useState, useEffect, useRef } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CreateNewFolder as CreateNewFolderIcon,
  NoteAdd as NoteAddIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { handleCopy } from '@/helpers/stringHelper.ts';
import Editor, { OnMount } from '@monaco-editor/react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';

export interface IBase {
  name: string;
  type: 'file' | 'folder';
}

export interface IFile extends IBase {
  type: 'file';
  content: string;
}

export interface IFolder extends IBase {
  type: 'folder';
  children: (IFile | IFolder)[];
}

export type IStructure = (IFile | IFolder)[];

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// Define a type for the editor
interface ICodeEditor {
  getValue(): string;
}

function FileViewer({
  folderStructure: initialFolderStructure,
  mode,
}: {
  folderStructure: IStructure;
  mode: 'edit' | 'view';
}) {
  const { editValue, newValue, promptModal } = useModalStore();
  const [folderStructure, setFolderStructure] = useState<IStructure>(
    initialFolderStructure,
  );
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item?: IFile | IFolder;
    parentPath?: string[];
  } | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const editorRef = useRef<ICodeEditor | null>(null);

  // Update folderStructure when initialFolderStructure changes
  useEffect(() => {
    setFolderStructure(initialFolderStructure);
  }, [initialFolderStructure]);

  // Update fileContent when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      const findFile = (
        items: IStructure,
        path: string[] = [],
      ): { file: IFile | null; path: string[] } => {
        for (const item of items) {
          if (item.type === 'file' && item.name === selectedFile.name) {
            // Fix the unnecessary conditional
            return { file: item, path };
          } else if (item.type === 'folder') {
            const found = findFile(item.children, [...path, item.name]);
            if (found.file) {
              return found;
            }
          }
        }
        return { file: null, path: [] };
      };

      const { file, path } = findFile(folderStructure);
      if (file) {
        setSelectedFile(file);
        setCurrentPath(path);
      } else {
        setSelectedFile(null);
        setCurrentPath([]);
      }
    }
  }, [folderStructure, selectedFile]);

  // Handle editor mount with proper type
  const handleEditorDidMount: OnMount = (editor) => {
    // Store the editor with our interface that only exposes what we need
    editorRef.current = {
      getValue: () => editor.getValue(),
    };
  };

  // Save file content changes
  const saveFileChanges = () => {
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
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleOpenDialog = async (
    type: 'newFile' | 'newFolder' | 'rename',
    item?: IFile | IFolder,
  ) => {
    // Get parent path from context menu
    let parentPath = contextMenu?.parentPath ?? [];
    
    // If we're creating a new file/folder and the context menu has a folder item selected,
    // add that folder to the parent path so the new item is created inside it
    if ((type === 'newFile' || type === 'newFolder') && 
        contextMenu?.item && 
        contextMenu.item.type === 'folder') {
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
    const newFilePath = customPath ?? (contextMenu?.parentPath ?? []);
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
    const newFolderPath = customPath ?? (contextMenu?.parentPath ?? []);
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
    const item = contextMenu?.item;
    // Store the relevant information
    const parentPath = contextMenu?.parentPath ?? [];
    
    // Close the context menu immediately before showing the modal
    handleCloseContextMenu();
    
    if (item) {
      void (async () => {
        await deleteItem(item, parentPath);
      })();
    }
  };

  // Delete file or folder
  const deleteItem = async (item: IFile | IFolder, parentPath: string[] = []) => {
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
    onSelectFile: (file: IFile) => void,
    parentId = '',
    parentPath: string[] = [],
  ) {
    const folderColor = mode === 'edit' ? 'text-yellow-500' : 'text-gray-200';
    return items.map((item, index) => {
      const itemId = `${parentId}-${item.name}-${String(index)}`;
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
      } else {
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
              onSelectFile(item);
            }}
          />
        );
      }
    });
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="grid grid-cols-1 md:grid-cols-3 text-white">
        <div className="col-span-1 bg-gray-800 p-4 select-none">
          <div>
            <div className="flex justify-between mb-4">
              <button
                onClick={() => {
                  handleCopy(JSON.stringify(folderStructure, null, 4));
                }}
                className="h-max w-max bg-in px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Copy Folder Structure
              </button>

              {mode === 'edit' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      void (async () => {
                        await handleOpenDialog('newFile');
                      })();
                    }}
                    className="h-max w-max bg-green-600 p-2 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-500 focus:ring-opacity-50 flex items-center"
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
                    className="h-max w-max bg-blue-600 p-2 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
                    title="New Folder"
                    aria-label="New Folder"
                  >
                    <CreateNewFolderIcon fontSize="small" />
                  </button>
                </div>
              )}
            </div>

            <div
              className="overflow-auto max-h-96"
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
                  <div className="bg-[#1f1f1f] w-max p-2 rounded-t-md">
                    <span>{selectedFile.name}&nbsp;</span>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                      }}
                      className="hover:bg-gray-700 text-white px-2 py-1 rounded"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                </div>
                <div>
                  {mode === 'edit' && (
                    <button
                      onClick={saveFileChanges}
                      className="hover:bg-green-700 bg-green-600 text-white px-3 py-1 rounded mr-2 float-right"
                    >
                      <SaveIcon fontSize="small" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleCopy(selectedFile.content);
                    }}
                    className="hover:bg-gray-700 text-white px-2 py-1 rounded float-right"
                  >
                    Copy &nbsp;
                    <CopyIcon fontSize="small" />
                  </button>
                </div>
              </div>
              <Editor
                height="420px"
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
                onChange={(value) => {
                  setFileContent(value ?? '');
                }}
                onMount={handleEditorDidMount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {!contextMenu?.item
          ? [
              <MenuItem
                key="newFile"
                onClick={() => {
                  void (async () => {
                    await handleOpenDialog('newFile');
                  })();
                }}
              >
                <ListItemIcon>
                  <NoteAddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>New File</ListItemText>
              </MenuItem>,
              <MenuItem
                key="newFolder"
                onClick={() => {
                  void (async () => {
                    await handleOpenDialog('newFolder');
                  })();
                }}
              >
                <ListItemIcon>
                  <CreateNewFolderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>New Folder</ListItemText>
              </MenuItem>,
            ]
          : [
              <MenuItem
                key="rename"
                onClick={() => {
                  void (async () => {
                    await handleOpenDialog('rename', contextMenu.item);
                  })();
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Rename</ListItemText>
              </MenuItem>,
              <MenuItem key="delete" onClick={handleDeleteItem}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>,
              ...(contextMenu.item.type === 'folder'
                ? [
                    <MenuItem
                      key="newFileInFolder"
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFile');
                        })();
                      }}
                    >
                      <ListItemIcon>
                        <NoteAddIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>New File</ListItemText>
                    </MenuItem>,
                    <MenuItem
                      key="newFolderInFolder"
                      onClick={() => {
                        void (async () => {
                          await handleOpenDialog('newFolder');
                        })();
                      }}
                    >
                      <ListItemIcon>
                        <CreateNewFolderIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>New Folder</ListItemText>
                    </MenuItem>,
                  ]
                : []),
            ]}
      </Menu>
    </ThemeProvider>
  );
}

export default FileViewer;
