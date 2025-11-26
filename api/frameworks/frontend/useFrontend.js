import createAPICalls from '../../frameworks/frontend/createAPICalls';
import createTypescriptInterfaces from '../../frameworks/frontend/createTypescriptInterfaces';
import createAxiosInstance from '../../frameworks/frontend/createAxiosInstance';
import createAxiosInterceptor from '../../frameworks/frontend/createAxiosInterceptor';
import createAPIHooks from '../../frameworks/frontend/createAPIHooks';
import createTypescriptInterfacesBarrelExport from '../../frameworks/frontend/createTypescriptInterfacesBarrelExport';
export function useFrontend({
  schemaInfo,
  includeTypeGuards,
  outputOnSingleFile,
}) {
  const fileStructure = [
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
