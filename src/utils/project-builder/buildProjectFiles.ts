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
import { processCoreFiles } from '@/utils/project-builder/utils/processCoreFiles.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';
import { createContext } from '@/utils/project-builder/helpers/contextHelpers.ts';

export interface IFailedFormatEntry {
  filePath: string;
  errorMessage: string;
}

export interface IBuildProjectFilesResult {
  structure: IStructure;
  filesUsingUserEnv: string[];
  filesFailedToFormat: IFailedFormatEntry[];
}

export const buildProjectFiles = async (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  formData: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): Promise<IBuildProjectFilesResult> => {
  const filesUsingUserEnv: string[] = [];
  const filesFailedToFormat: IFailedFormatEntry[] = [];

  const trackFileUsingUserEnv = (filePath: string): void => {
    if (!filesUsingUserEnv.includes(filePath)) {
      filesUsingUserEnv.push(filePath);
    }
  };

  const trackFileFailedToFormat = (
    filePath: string,
    errorMessage: string,
  ): void => {
    if (!filesFailedToFormat.some((entry) => entry.filePath === filePath)) {
      filesFailedToFormat.push({ filePath, errorMessage });
    }
  };
  const schemaInfoParsed = getSchemaInfo(schemaInfo);
  const file = findFileInStructure(projectYamlPath, userFiles);

  if (!file) {
    return {
      structure: [
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
      ],
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
    };
  }

  const circularImportCheck = detectCircularImports(projectYamlPath, userFiles);

  if (circularImportCheck.hasCircularImport) {
    return {
      structure: [
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
      ],
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
    };
  }

  try {
    const parsedYaml: unknown = parse(file.content);

    const placeholders = extractPlaceholdersFromYaml(parsedYaml);
    const circularPlaceholderCheck =
      detectCircularPlaceholderImports(placeholders);

    if (circularPlaceholderCheck.hasCircularReference) {
      return {
        structure: [
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
        ],
        filesUsingUserEnv: [],
        filesFailedToFormat: [],
      };
    }

    const rawCoreFiles = loadCoreFiles(projectYamlPath, userFiles);

    // Process core files to handle template commands like USE_USER_ENV
    const coreFiles = processCoreFiles(
      rawCoreFiles,
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
      projectYamlPath,
      trackFileUsingUserEnv,
    );

    let yamlStructureToProcess: unknown = parsedYaml;
    if (
      parsedYaml !== null &&
      typeof parsedYaml === 'object' &&
      !Array.isArray(parsedYaml) &&
      '$USE_CORE' in parsedYaml
    ) {
      const entries = Object.entries(parsedYaml).filter(
        ([key]) => key !== '$USE_CORE',
      );
      yamlStructureToProcess = Object.fromEntries(entries);
    }

    const ctx = createContext(
      userFiles,
      schemaInfo,
      schemaInfoParsed,
      projectYamlPath,
      formData,
      userMetadata,
      undefined, // table
      undefined, // dataContext
      undefined, // currentPath
      yamlStructureToProcess, // node
      undefined, // command
      undefined, // folderName
      undefined, // children
      undefined, // options
      trackFileUsingUserEnv,
      trackFileFailedToFormat,
    );

    const scaffoldedFiles = await processYamlStructure(ctx);

    const projectFiles = mergeCoreFilesWithScaffolded(
      coreFiles,
      scaffoldedFiles,
    );

    const filteredFiles = projectFiles.filter(
      (item) => item.name !== 'core' && item.name !== 'Core',
    );

    // Detect files using USE_USER_ENV by scanning the final structure
    // This catches cases where USE_USER_ENV patterns remain (weren't replaced)
    const scanForUserEnv = (items: IStructure, basePath = ''): void => {
      for (const item of items) {
        const currentPath =
          basePath === '' ? item.name : `${basePath}/${item.name}`;

        if (item.type === 'file') {
          if (USE_USER_ENV_REGEX.test(item.content)) {
            filesUsingUserEnv.push(currentPath);
          }
        } else {
          scanForUserEnv(item.children, currentPath);
        }
      }
    };

    scanForUserEnv(filteredFiles);

    return {
      structure: filteredFiles,
      filesUsingUserEnv,
      filesFailedToFormat,
    };
  } catch (error) {
    return {
      structure: [
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
      ],
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
    };
  }
};
