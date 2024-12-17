import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createAPIRoutes from '@/frameworks/backend/laravel/createAPIRoutes';
import createAppServiceProviderScaffolding from '@/frameworks/backend/laravel/createAppServiceProviderScaffolding';
import createControllers from '@/frameworks/backend/laravel/createControllers';
import createInterfaces from '@/frameworks/backend/laravel/createInterfaces';
import createModels from '@/frameworks/backend/laravel/createModels';
import createRepositories from '@/frameworks/backend/laravel/createRepositories';
import createResources from '@/frameworks/backend/laravel/createResources';
import createServices from '@/frameworks/backend/laravel/createServices';
import createBaseFiles from '@/frameworks/backend/laravel/createBaseFiles';

export function useLaravel({
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
                createBaseFiles('controller'),
                ...createControllers(schemaInfo),
              ],
            },
            {
              type: 'folder',
              name: 'Resources',
              files: createResources(schemaInfo),
            },
          ],
        },
        {
          type: 'folder',
          name: 'Models',
          files: createModels(schemaInfo),
        },
        {
          type: 'folder',
          name: 'Providers',
          files: [
            createAppServiceProviderScaffolding({
              schemaInfo,
            }),
          ],
        },
        {
          type: 'folder',
          name: 'Repositories',
          files: [
            createBaseFiles('interface'),
            createBaseFiles('repository'),
            ...createRepositories(schemaInfo),
            ...createInterfaces(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'Services',
          files: [createBaseFiles('service'), ...createServices(schemaInfo)],
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
          content: createAPIRoutes(schemaInfo),
        },
      ],
    },
  ];

  return fileStructure;
}
