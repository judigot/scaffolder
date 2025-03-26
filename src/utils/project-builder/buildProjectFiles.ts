import { IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';

export const buildProjectFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
): IStructure => {
  const schemaInfoParsed = getSchemaInfo(schemaInfo);
  const file = findFileInStructure(projectYamlPath, userFiles);

  if (!file) {
    console.error(`File not found at path: ${String(projectYamlPath)}`);
    return [
      {
        type: 'file',
        name: 'Test5.txt',
        content: 'Test5',
      },
    ];
  }

  try {
    const parsedYaml: unknown = parse(file.content);
    return processYamlStructure(
      parsedYaml,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error parsing YAML:', error.message);
    } else {
      console.error('Unknown error parsing YAML');
    }
    return [
      {
        type: 'file',
        name: 'error.log',
        content: [
          '❌ CODE GENERATION FAILED',
          '',
          '📅 Timestamp:',
          new Date().toISOString(),
          '',
          '📂 Error:',
          '='.repeat(50),
          String(error),
          '='.repeat(50),
          '',
          '💡 Suggestion:',
          'Please check your YAML structure or configuration input.',
          'If this persists, report the issue along with this log.',
        ].join('\n'),
      },
    ];
  }
};
