import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

const createTypescriptInterfacesBarrelExport = (
  schemaInfo: ISchemaInfo[],
): IStructure => {
  const contentArray = schemaInfo.map(({ tableName }) => {
    const interfaceName =
      tableName.charAt(0).toUpperCase() + tableName.slice(1);
    return `export * from './${interfaceName}';`;
  });

  const combinedContent = contentArray.join('\n'); // Separate each export with a new line

  return [
    {
      type: 'file',
      name: 'interfaces.ts',
      content: combinedContent,
    },
  ];
};

export default createTypescriptInterfacesBarrelExport;
