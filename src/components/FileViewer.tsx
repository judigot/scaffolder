import { useState } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import FolderIcon from '@mui/icons-material/Folder';
import { ISchemaInfo } from '@/interfaces/interfaces';
import _createAPIRoutes from '@/utils/backend/laravel/_createAPIRoutes';
import _createControllers from '@/utils/backend/laravel/_createControllers';
import _createResources from '@/utils/backend/laravel/_createResources';
import _createModels from '@/utils/backend/laravel/_createModels';
import _createRepositories from '@/utils/backend/laravel/_createRepositories';
import _createAppServiceProviderScaffolding from '@/utils/backend/laravel/_createAppServiceProviderScaffolding';
import _createServices from '@/utils/backend/laravel/_createServices';
import _createInterfaces from '@/utils/backend/laravel/_createInterfaces';
import _createBaseRepository from '@/utils/backend/laravel/_createBaseRepository';
import _createBaseInterface from '@/utils/backend/laravel/_createBaseInterface';
import { handleCopy } from '@/helpers/stringHelper';
import _createBaseController from '@/utils/backend/laravel/_createBaseController';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export interface IFile {
  type: 'file';
  name: string;
  content: string;
}

export interface IFolder {
  type: 'folder';
  name: string;
  files: (IFile | IFolder)[];
}

export type IStructure = (IFile | IFolder)[];

export default function FileViewer({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}) {
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);

  const fileStructure: IStructure = [
    {
      type: 'folder',
      name: 'app',
      files: [
        {
          type: 'folder',
          name: 'Http',
          files: [
            {
              type: 'folder',
              name: 'Controllers',
              files: [
                _createBaseController(),
                ..._createControllers(schemaInfo),
              ],
            },
            {
              type: 'folder',
              name: 'Resources',
              files: _createResources(schemaInfo),
            },
          ],
        },
        {
          type: 'folder',
          name: 'Models',
          files: _createModels(schemaInfo),
        },
        {
          type: 'folder',
          name: 'Providers',
          files: [
            {
              type: 'file',
              name: 'AppServiceProvider.php',
              content: _createAppServiceProviderScaffolding({ schemaInfo }),
            },
          ],
        },
        {
          type: 'folder',
          name: 'Repositories',
          files: [
            _createBaseInterface(),
            _createBaseRepository(),
            ..._createRepositories(schemaInfo),
            ..._createInterfaces(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'Services',
          files: _createServices(schemaInfo),
        },
      ],
    },
    {
      type: 'folder',
      name: 'routes',
      files: [
        {
          type: 'file',
          name: 'api.php',
          content: _createAPIRoutes(schemaInfo),
        },
      ],
    },
  ];

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
                <FolderIcon fontSize="small" className="text-yellow-500" />
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
      <div className="grid grid-cols-3 h-screen text-white">
        <div className="col-span-1 bg-gray-800 p-4 select-none">
          <SimpleTreeView>
            {renderTree(fileStructure, setSelectedFile)}
          </SimpleTreeView>
        </div>
        <div className="col-span-2 bg-gray-900 p-4">
          {selectedFile && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="">{selectedFile.name}</span>
                <CopyIcon
                  onClick={() => {
                    handleCopy(selectedFile.content);
                  }}
                  fontSize="small"
                  className="cursor-pointer"
                />
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
          )}

          {!selectedFile && (
            <div className="text-gray-400 text-center">No file selected</div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
