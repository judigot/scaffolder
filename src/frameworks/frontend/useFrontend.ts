import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import createAPICalls from '@/frameworks/frontend/createAPICalls.ts';
import createTypescriptInterfaces from '@/frameworks/frontend/createTypescriptInterfaces.ts';
import createAxiosInstance from '@/frameworks/frontend/createAxiosInstance.ts';
import createAxiosInterceptor from '@/frameworks/frontend/createAxiosInterceptor.ts';
import createAPIHooks from '@/frameworks/frontend/createAPIHooks.ts';
import createTypescriptInterfacesBarrelExport from '@/frameworks/frontend/createTypescriptInterfacesBarrelExport.ts';

export function useFrontend({
  schemaInfo,
  includeTypeGuards,
  outputOnSingleFile,
}: {
  schemaInfo: ISchemaInfo[];
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
}): IStructure {
  const fileStructure: IStructure = [
    {
      type: 'folder',
      name: 'src',
      children: [
        {
          type: 'folder',
          name: 'services',
          children: [
            createAxiosInstance(),
            createAxiosInterceptor(),
            ...createAPICalls(schemaInfo),
          ],
        },
        {
          type: 'folder',
          name: 'hooks',
          children: [...createAPIHooks(schemaInfo)],
        },
        {
          type: 'folder',
          name: 'interfaces',
          children: [
            ...(!outputOnSingleFile
              ? createTypescriptInterfacesBarrelExport(schemaInfo)
              : []),
            ...createTypescriptInterfaces(
              schemaInfo,
              includeTypeGuards,
              outputOnSingleFile,
            ),
          ],
        },
      ],
    },
  ];

  return fileStructure;
}
