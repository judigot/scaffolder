import { useState } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface IFile {
  type: 'file';
  name: string;
  content: string;
}

interface IFolder {
  type: 'folder';
  name: string;
  files: (IFile | IFolder)[];
}

type IStructure = (IFile | IFolder)[];

const structure: IStructure = [
  {
    type: 'folder',
    name: 'src',
    files: [
      {
        type: 'file',
        name: 'main.js',
        content: 'console.log("Main file content");',
      },
    ],
  },
  {
    type: 'file',
    name: 'script.sh',
    content: `#!/bin/bash

GLOBAL_VARIABLE="Hello, World!"

main() {
    action1
    action2
}

action1() {
    echo -e "Action 1"
}

action2() {
    echo -e "Action 2"
}

main`,
  },
];

function renderTree(
  items: IStructure,
  onSelectFile: (file: IFile) => void,
  parentId = '',
) {
  return items.map((item, index) => {
    const itemId = `${parentId}-${item.name}-${String(index)}`;
    if (item.type === 'folder') {
      return (
        <TreeItem key={itemId} itemId={itemId} label={item.name}>
          {renderTree(item.files, onSelectFile, itemId)}
        </TreeItem>
      );
    } else {
      return (
        <TreeItem
          key={itemId}
          itemId={itemId}
          label={item.name}
          onClick={() => {
            onSelectFile(item);
          }}
        />
      );
    }
  });
}

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

export default function FileViewer() {
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="grid grid-cols-3 h-screen text-white">
        <div className="col-span-1 bg-gray-800 p-4">
          <SimpleTreeView>
            {renderTree(structure, setSelectedFile)}
          </SimpleTreeView>
        </div>
        <div className="col-span-2 bg-gray-900 p-4">
          {selectedFile ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="">{selectedFile.name}</span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                  }}
                  className="hover:bg-gray-700 text-white px-2 py-1 rounded"
                >
                  <CloseIcon fontSize="small" />
                </button>
              </div>
              <div className="relative grid grid-cols-[auto_1fr]">
                {
                  <>
                    <LineCounter
                      lines={selectedFile.content.split('\n').length}
                    />
                    <pre className="whitespace-pre-wrap px-4 rounded leading-6">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </>
                }
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center">No file selected</div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
