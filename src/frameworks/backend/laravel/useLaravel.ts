import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import createAPIRoutes from '@/frameworks/backend/laravel/createAPIRoutes.ts';
import createAppServiceProviderScaffolding from '@/frameworks/backend/laravel/createAppServiceProviderScaffolding.ts';
import createControllers from '@/frameworks/backend/laravel/createControllers.ts';
import createInterfaces from '@/frameworks/backend/laravel/createInterfaces.ts';
import createModels from '@/frameworks/backend/laravel/createModels.ts';
import createRepositories from '@/frameworks/backend/laravel/createRepositories.ts';
import createResources from '@/frameworks/backend/laravel/createResources.ts';
import createServices from '@/frameworks/backend/laravel/createServices.ts';
import createBaseFiles from '@/frameworks/backend/laravel/createBaseFiles.ts';

export function getLaravelStructure({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}): IStructure {
  const fileStructure: IStructure = [
    {
      type: 'folder',
      name: 'app',
      children: [
        {
          type: 'folder',
          name: 'Http',
          children: [
            {
              type: 'folder',
              name: 'Controllers',
              children: [
                createBaseFiles('controller'),
                ...createControllers(schemaInfo),
              ],
            },
            {
              type: 'folder',
              name: 'Resources',
              children: [...createResources(schemaInfo)],
            },
          ],
        },
        {
          type: 'folder',
          name: 'Models',
          children: [...createModels(schemaInfo)],
        },
        {
          type: 'folder',
          name: 'Providers',
          children: [
            createAppServiceProviderScaffolding({
              schemaInfo,
            }),
          ],
        },
        {
          type: 'folder',
          name: 'Repositories',
          children: [
            createBaseFiles('interface'),
            createBaseFiles('repository'),
            ...createRepositories(schemaInfo),
            ...createInterfaces(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'Services',
          children: [createBaseFiles('service'), ...createServices(schemaInfo)],
        },
      ],
    },
    {
      type: 'folder',
      name: 'routes',
      children: [...createAPIRoutes(schemaInfo)],
    },
  ];

  return fileStructure;
}

// Keep the old name for backward compatibility
export const useLaravel = getLaravelStructure;
