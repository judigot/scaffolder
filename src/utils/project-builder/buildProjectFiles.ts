import { IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { detectCircularImports } from '@/utils/project-builder/utils/detectCircularImports.ts';

export const buildProjectFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
): IStructure => {
  const schemaInfoParsed = getSchemaInfo(schemaInfo);
  const file = findFileInStructure(projectYamlPath, userFiles);

  if (!file) {
    return [
      {
        type: 'file',
        name: 'file-not-found.log',
        content: [
          '❌ FILE NOT FOUND',
          '',
          '📅 Timestamp:',
          new Date().toISOString(),
          '',
        ].join('\n'),
      },
    ];
  }

  const circularImportCheck = detectCircularImports(projectYamlPath, userFiles);

  if (circularImportCheck.hasCircularImport) {
    return [
      {
        type: 'file',
        name: 'circular-import-error.log',
        content: [
          '❌ CODE GENERATION FAILED: INFINITE IMPORT LOOP DETECTED',
          '',
          '📅 Timestamp:',
          new Date().toISOString(),
          '',
          '🔎 Circular Import Chain Detected:',
          '='.repeat(50),
          circularImportCheck.cycleChain,
          '='.repeat(50),
          '',
          '💡 Suggestion:',
          'It looks like your YAML project files are importing each other in a cycle.',
          'Please revise the IMPORT_PROJECT directives and ensure that each project import chain ends cleanly.',
          '',
          'Example of what to avoid:',
          'A.yaml imports B.yaml, B.yaml imports C.yaml, and C.yaml imports A.yaml.',
          '',
          'If this persists, report the issue along with this log.',
        ].join('\n'),
      },
    ];
  }

  try {
    const parsedYaml: unknown = parse(file.content);

    const projectFiles = processYamlStructure({
      node: parsedYaml,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath,
    });

    return projectFiles;
  } catch (error) {
    return [
      {
        type: 'file',
        name: 'invalid-yaml-structure.log',
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
