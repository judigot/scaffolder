import createControllers from '../../../frameworks/backend/nextjs/createControllers';
import createAPIRoutes from '../../../frameworks/backend/nextjs/createAPIRoutes';
import createDatabaseClient from '../../../frameworks/backend/nextjs/createDatabaseClient';
import createDataTypeParser from '../../../frameworks/backend/nextjs/createDataTypeParser';
export function getNextJSStructure({ schemaInfo }) {
  const fileStructure = [
    {
      type: 'folder',
      name: 'src',
      children: [
        {
          type: 'folder',
          name: 'app',
          children: [
            {
              type: 'folder',
              name: 'api',
              children: createAPIRoutes(schemaInfo),
            },
            {
              type: 'folder',
              name: 'Http',
              children: [
                {
                  type: 'folder',
                  name: 'Controllers',
                  children: createControllers(schemaInfo),
                },
              ],
            },
          ],
        },
        {
          type: 'folder',
          name: 'prisma',
          children: [createDatabaseClient()],
        },
        {
          type: 'folder',
          name: 'utils',
          children: [createDataTypeParser()],
        },
      ],
    },
  ];
  return fileStructure;
}
// Keep the old name for backward compatibility
export const useNextJS = getNextJSStructure;
