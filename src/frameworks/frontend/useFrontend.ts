import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createAPICalls from '@/frameworks/frontend/createAPICalls';
import createTypescriptInterfaces from '@/frameworks/frontend/createTypescriptInterfaces';

export function useFrontend({
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
              name: 'services',
              files: createAPICalls(schemaInfo),
            },
          ],
        },
        {
          type: 'folder',
          name: 'interfaces',
          files: [...createTypescriptInterfaces(schemaInfo)],
        },
      ],
    },
  ];

  return fileStructure;
}
