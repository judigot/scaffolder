import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import _createAPIRoutes from '@/utils/backend/laravel/_createAPIRoutes';
import _createAppServiceProviderScaffolding from '@/utils/backend/laravel/_createAppServiceProviderScaffolding';
import _createBaseController from '@/utils/backend/laravel/_createBaseController';
import _createBaseInterface from '@/utils/backend/laravel/_createBaseInterface';
import _createBaseRepository from '@/utils/backend/laravel/_createBaseRepository';
import _createControllers from '@/utils/backend/laravel/_createControllers';
import _createInterfaces from '@/utils/backend/laravel/_createInterfaces';
import _createModels from '@/utils/backend/laravel/_createModels';
import _createRepositories from '@/utils/backend/laravel/_createRepositories';
import _createResources from '@/utils/backend/laravel/_createResources';
import _createServices from '@/utils/backend/laravel/_createServices';

export function folderStructure({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}): IStructure {
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
            _createAppServiceProviderScaffolding({
              schemaInfo,
            }),
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

  return fileStructure;
}
