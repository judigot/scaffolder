import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces.ts';

const createTypescriptInterfaces = (schemaInfo: ISchemaInfo[]): IStructure => {
  const interfaces = generateTypescriptInterfaces({
    schemaInfo,
    includeTypeGuards: true,
    outputOnSingleFile: false,
  });
  return Object.entries(interfaces).map(([interfaceName, content]) => {
    const fileName = `${interfaceName}.ts`;
    return {
      type: 'file',
      name: fileName,
      content,
    };
  });
};

export default createTypescriptInterfaces;
