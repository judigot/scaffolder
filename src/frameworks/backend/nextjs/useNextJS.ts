import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import createControllers from '@/frameworks/backend/nextjs/createControllers.ts';
import createAPIRoutes from '@/frameworks/backend/nextjs/createAPIRoutes.ts';
import createDatabaseClient from '@/frameworks/backend/nextjs/createDatabaseClient.ts';
import createDataTypeParser from '@/frameworks/backend/nextjs/createDataTypeParser.ts';

export function getNextJSStructure({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}): IStructure {
  const fileStructure: IStructure = [
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
              files: createAPIRoutes(schemaInfo),
            },
            {
              type: 'folder',
              name: 'Http',
              children: [
                {
                  type: 'folder',
                  name: 'Controllers',
                  files: createControllers(schemaInfo),
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
