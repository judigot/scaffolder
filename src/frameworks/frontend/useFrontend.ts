import { IStructure } from "@/components/FileViewer.tsx";
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import createAPICalls from '@/frameworks/frontend/createAPICalls.ts';
import createTypescriptInterfaces from '@/frameworks/frontend/createTypescriptInterfaces.ts';
import createAxiosInstance from '@/frameworks/frontend/createAxiosInstance.ts';
import createAxiosInterceptor from '@/frameworks/frontend/createAxiosInterceptor.ts';
import createAPIHooks from '@/frameworks/frontend/createAPIHooks.ts';

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
