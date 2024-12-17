import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createAPIRoutes from '@/frameworks/backend/laravel/createAPIRoutes';
import createAppServiceProviderScaffolding from '@/frameworks/backend/laravel/createAppServiceProviderScaffolding';
import createBaseController from '@/frameworks/backend/laravel/createBaseController';
import createControllers from '@/frameworks/backend/laravel/createControllers';
import createInterfaces from '@/frameworks/backend/laravel/createInterfaces';
import createModels from '@/frameworks/backend/laravel/createModels';
import createRepositories from '@/frameworks/backend/laravel/createRepositories';
import createResources from '@/frameworks/backend/laravel/createResources';
import createServices from '@/frameworks/backend/laravel/createServices';
import createBaseInterfaceAndRepository from '@/frameworks/backend/laravel/createBaseInterfaceAndRepository';

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
              files: [createBaseController(), ...createControllers(schemaInfo)],
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
            createBaseInterfaceAndRepository('interface'),
            createBaseInterfaceAndRepository('repository'),
            ...createRepositories(schemaInfo),
            ...createInterfaces(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'Services',
          files: createServices(schemaInfo),
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
