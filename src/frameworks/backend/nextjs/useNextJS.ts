import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createControllers from '@/frameworks/backend/nextjs/createControllers';
import createAPIRoutes from '@/frameworks/backend/nextjs/createAPIRoutes';
import createDatabaseClient from '@/frameworks/backend/nextjs/createDatabaseClient';
import createDataTypeParser from '@/frameworks/backend/nextjs/createDataTypeParser';

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
