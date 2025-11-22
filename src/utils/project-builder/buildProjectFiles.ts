import type { IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { detectCircularImports } from '@/utils/project-builder/utils/detectCircularImports.ts';
import { extractPlaceholdersFromYaml } from '@/utils/project-builder/utils/extractPlaceholdersFromYaml.ts';
import { detectCircularPlaceholderImports } from '@/utils/project-builder/utils/detectCircularPlaceholderImports.ts';
import { loadCoreFiles } from '@/utils/project-builder/utils/loadCoreFiles.ts';
import { mergeCoreFilesWithScaffolded } from '@/utils/project-builder/utils/mergeCoreFiles.ts';

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

    const placeholders = extractPlaceholdersFromYaml(parsedYaml);
    const circularPlaceholderCheck =
      detectCircularPlaceholderImports(placeholders);

    if (circularPlaceholderCheck.hasCircularReference) {
      return [
        {
          type: 'file',
          name: 'circular-placeholder-error.log',
          content: [
            '❌ CODE GENERATION FAILED: CIRCULAR PLACEHOLDER REFERENCES DETECTED',
            '',
            '📅 Timestamp:',
            new Date().toISOString(),
            '',
            '🔎 Circular Placeholder Chain Detected:',
            '='.repeat(50),
            circularPlaceholderCheck.circularPath,
            '='.repeat(50),
            '',
            '💡 Suggestion:',
            'Your YAML file contains placeholders that reference each other in a circular way.',
            'For example, if property A references property B, and property B references property A,',
            'this creates an infinite loop that cannot be resolved.',
            '',
            'Please check your placeholders in the form {{propertyName}} and ensure they',
            'do not create circular dependencies.',
            '',
            'If this persists, report the issue along with this log.',
          ].join('\n'),
        },
      ];
    }

    const coreFiles = loadCoreFiles(projectYamlPath, userFiles);

    const scaffoldedFiles = processYamlStructure({
      node: parsedYaml,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath,
    });

    const projectFiles = mergeCoreFilesWithScaffolded(
      coreFiles,
      scaffoldedFiles,
    );

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
