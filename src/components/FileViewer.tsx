import { useState } from 'react';
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
import { vscDarkPlus as highlightStyle } from 'react-syntax-highlighter/dist/esm/styles/prism/index.js';

export interface IBase {
  name: string;
  path?: string;
  type: 'file' | 'folder';
}

export interface IFile extends IBase {
  type: 'file';
  content: string;
  replacements?: Record<
    string,
    string | (() => string | Record<string, string>)
  >;
}

export interface IFolder extends IBase {
  type: 'folder';
  files: (IFile | IFolder)[];
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

  function LineCounter({ lines }: { lines: number }) {
    return (
      <div
        className="pr-4 text-gray-500 text-right select-none"
        aria-hidden="true"
      >
        {Array.from({ length: lines }, (_, index) => (
          <pre key={index}>{index + 1}</pre>
        ))}
      </div>
    );
  }

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
            {renderTree(item.files, onSelectFile, itemId)}
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
            <div className="overflow-auto max-h-96">
              <SimpleTreeView>
                {renderTree(folderStructure, setSelectedFile)}
              </SimpleTreeView>
            </div>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2 overflow-auto">
          {selectedFile && (
            <div className="bg-gray-900">
              <div className="sticky left-0 top-0 z-20 bg-gray-800 flex justify-between items-center p-2">
                <span>
                  {selectedFile.name}&nbsp;
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                    }}
                    className="hover:bg-gray-700 text-white px-2 py-1 rounded"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </span>
                <button
                  onClick={() => {
                    handleCopy(selectedFile.content);
                  }}
                  className="hover:bg-gray-700 text-white px-2 py-1 rounded"
                >
                  Copy &nbsp;
                  <CopyIcon fontSize="small" />
                </button>
              </div>
              <div>
                <div className="relative grid grid-cols-[auto_1fr]">
                  <div className="sticky left-0 bg-gray-800 z-10">
                    <LineCounter
                      lines={selectedFile.content.split('\n').length}
                    />
                  </div>
                  <SyntaxHighlighter
                    language={(() => {
                      const fileExtension: string | undefined =
                        selectedFile.name.split('.').pop();
                      if (fileExtension == undefined) {
                        return 'typescript';
                      }
                      const languageMap: Record<string, string> = {
                        ts: 'typescript',
                        js: 'javascript',
                        php: 'php',
                        css: 'css',
                        sass: 'sass',
                        java: 'java',
                        sql: 'sql',
                      };
                      return languageMap[fileExtension] || 'javascript';
                    })()}
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    style={highlightStyle}
                  >
                    {selectedFile.content}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default FileViewer;
