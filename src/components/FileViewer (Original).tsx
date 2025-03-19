import { useState, useEffect } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { handleCopy } from '@/helpers/stringHelper.ts';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as highlightStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

function FileViewer({
  folderStructure,
  folderColor,
}: {
  folderStructure: IStructure;
  folderColor: string;
}) {
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const findFile = (items: IStructure): IFile | null => {
        for (const item of items) {
          if (item.type === 'file' && item.name === selectedFile.name) {
            return item;
          } else if (item.type === 'folder') {
            const found = findFile(item.children);
            if (found) {
              return found;
            }
          }
        }
        return null;
      };

      const newSelectedFile = findFile(folderStructure);
      if (newSelectedFile) {
        setSelectedFile(newSelectedFile);
      } else {
        setSelectedFile(null);
      }
    }
  }, [folderStructure, selectedFile]);

  function renderTree(
    items: IStructure,
    onSelectFile: (file: IFile) => void,
    parentId = '',
  ) {
    return items.map((item, index) => {
      const itemId = `${parentId}-${item.name}-${String(index)}`;
      if (item.type === 'folder') {
        return (
          <TreeItem
            key={itemId}
            itemId={itemId}
            label={
              <>
                <FolderIcon
                  fontSize="small"
                  className={`text-${folderColor}-500`}
                />
                &nbsp;
                {item.name}
              </>
            }
          >
            {renderTree(item.children, onSelectFile, itemId)}
          </TreeItem>
        );
      } else {
        return (
          <TreeItem
            key={itemId}
            itemId={itemId}
            label={
              <>
                <CodeIcon fontSize="small" className="text-yellow-500" />
                &nbsp;
                {item.name}
              </>
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
            <button
              onClick={() => {
                handleCopy(JSON.stringify(folderStructure, null, 4));
              }}
              className="h-max w-max bg-in mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Folder Structure
            </button>
            <br />
            <br />
            <div className="overflow-auto max-h-96">
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
              <SyntaxHighlighter
                showLineNumbers={true}
                customStyle={{
                  cursor: 'text',
                  backgroundColor: '#1f1f1f',
                  margin: '0',
                  height: '420px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#888 #444',
                }}
                lineNumberStyle={{
                  color: '#888',
                }}
                language={(() => {
                  const fileExtension: string | undefined = selectedFile.name
                    .split('.')
                    .pop();
                  if (fileExtension == undefined) {
                    return 'plaintext';
                  }
                  const languageMap: Record<string, string> = {
                    ts: 'typescript',
                    js: 'typescript',
                    php: 'php',
                    css: 'css',
                    sass: 'sass',
                    java: 'java',
                    sql: 'sql',
                    txt: 'plaintext',
                    jsx: 'jsx',
                    tsx: 'tsx',
                  };
                  return languageMap[fileExtension];
                })()}
                style={highlightStyle}
              >
                {selectedFile.content}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default FileViewer;
