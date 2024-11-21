import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createAPICalls from '@/frameworks/frontend/createAPICalls';
import createTypescriptInterfaces from '@/frameworks/frontend/createTypescriptInterfaces';
import createAxiosInstance from '@/frameworks/frontend/createAxiosInstance';
import createAxiosInterceptor from '@/frameworks/frontend/createAxiosInterceptor';
import createAPIHooks from '@/frameworks/frontend/createAPIHooks';

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
          name: 'services',
          files: [
            createAxiosInstance(),
            createAxiosInterceptor(),
            ...createAPICalls(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'hooks',
          files: [...createAPIHooks(schemaInfo)],
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
