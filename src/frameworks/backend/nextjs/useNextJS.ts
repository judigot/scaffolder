import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import createControllers from '@/frameworks/backend/nextjs/createControllers.ts';
import createAPIRoutes from '@/frameworks/backend/nextjs/createAPIRoutes.ts';
import createDatabaseClient from '@/frameworks/backend/nextjs/createDatabaseClient.ts';
import createDataTypeParser from '@/frameworks/backend/nextjs/createDataTypeParser.ts';

export function useNextJS({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}): IStructure {
  const fileStructure: IStructure = [
    {
      type: 'folder',
      name: 'src',
      files: [
        {
          type: 'folder',
          name: 'app',
          files: [
            {
              type: 'folder',
              name: 'api',
              files: createAPIRoutes(schemaInfo),
            },
            {
              type: 'folder',
              name: 'Http',
              files: [
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
          files: [createDatabaseClient()],
        },
        {
          type: 'folder',
          name: 'utils',
          files: [createDataTypeParser()],
        },
      ],
    },
  ];

  return fileStructure;
}
