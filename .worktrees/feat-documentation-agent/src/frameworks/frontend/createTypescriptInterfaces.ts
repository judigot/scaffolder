import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces.ts';

const createTypescriptInterfaces = (
  schemaInfo: ISchemaInfo[],
  includeTypeGuards: boolean,
  outputOnSingleFile: boolean,
): IStructure => {
  const interfaces = generateTypescriptInterfaces({
    schemaInfo,
    includeTypeGuards,
  });

  if (outputOnSingleFile) {
    const combinedContent = Object.entries(interfaces)
      .map(([, content]) => content)
      .join('\n\n'); // Separate each interface with a new line

    return [
      {
        type: 'file',
        name: 'interfaces.ts',
        content: combinedContent,
      },
    ];
  }

  return Object.entries(interfaces).map(([interfaceName, content]) => {
    return {
      type: 'file',
      name: `${interfaceName}.ts`,
      content,
    };
  });
};

export default createTypescriptInterfaces;
