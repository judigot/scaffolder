import createAPIRoutes from '../../../frameworks/backend/laravel/createAPIRoutes';
import createAppServiceProviderScaffolding from '../../../frameworks/backend/laravel/createAppServiceProviderScaffolding';
import createControllers from '../../../frameworks/backend/laravel/createControllers';
import createInterfaces from '../../../frameworks/backend/laravel/createInterfaces';
import createModels from '../../../frameworks/backend/laravel/createModels';
import createRepositories from '../../../frameworks/backend/laravel/createRepositories';
import createResources from '../../../frameworks/backend/laravel/createResources';
import createServices from '../../../frameworks/backend/laravel/createServices';
import createBaseFiles from '../../../frameworks/backend/laravel/createBaseFiles';
export function getLaravelStructure({ schemaInfo }) {
  const fileStructure = [
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
