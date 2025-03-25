import { IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { processYamlNode } from '@/utils/project-builder/project-processors/processYamlCode.ts';

export const buildProjectFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
): IStructure => {
  const schemaInfoParsed = getSchemaInfo(schemaInfo);
  const file = findFileInStructure(projectYamlPath, userFiles);

  if (!file) {
    console.error(`File not found at path: ${String(projectYamlPath)}`);
    return [];
  }

  try {
    const parsedYaml: unknown = parse(file.content);
    if (!(parsedYaml !== null && typeof parsedYaml === 'object')) {
      throw new Error('Invalid YAML content');
    }
    return processYamlNode(parsedYaml, schemaInfo, schemaInfoParsed, userFiles);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error parsing YAML:', error.message);
    } else {
      console.error('Unknown error parsing YAML');
    }
    return [];
  }
};
