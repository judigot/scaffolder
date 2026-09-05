import { parse } from 'yaml';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IScaffolderMessage } from '@/interfaces/scaffolderMessages.ts';
import { SCAFFOLDER_MESSAGE_CODES } from '@/interfaces/scaffolderMessages.ts';
import type { IFormStore } from '@/useFormStore.ts';
import generateMockData from '@/utils/generateMockData.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { identifyAuthResources } from '@/utils/identifyAuthResources.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';
import { createContext } from '@/utils/project-builder/helpers/contextHelpers.ts';
import {
  createScaffolderMessage,
  formatMessagesAsJson,
  formatMessagesAsMarkdown,
  formatMessagesBySeverity,
} from '@/utils/project-builder/messages.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { detectCircularImports } from '@/utils/project-builder/utils/detectCircularImports.ts';
import { detectCircularPlaceholderImports } from '@/utils/project-builder/utils/detectCircularPlaceholderImports.ts';
import { detectLeftoverTemplateMarkers } from '@/utils/project-builder/utils/detectLeftoverTemplateMarkers.ts';
import { extractPlaceholdersFromYaml } from '@/utils/project-builder/utils/extractPlaceholdersFromYaml.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import {
  loadCoreFiles,
  type ILoadCoreFilesOptions,
} from '@/utils/project-builder/utils/loadCoreFiles.ts';
import { loadSchemas } from '@/utils/project-builder/utils/loadSchemas.ts';
import { mergeCoreFilesWithScaffolded } from '@/utils/project-builder/utils/mergeCoreFiles.ts';
import { processCoreFiles } from '@/utils/project-builder/utils/processCoreFiles.ts';

export interface IFailedFormatEntry {
  filePath: string;
  errorMessage: string;
}

export interface IBuildProjectFilesResult {
  structure: IStructure;
  filesUsingUserEnv: string[];
  filesFailedToFormat: IFailedFormatEntry[];
  messages?: IScaffolderMessage[];
  hasErrors?: boolean;
  hasWarnings?: boolean;
}

export const ENABLE_MESSAGE_SUMMARY_FILES = false;

export const buildProjectFiles = async (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  formData: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  coreOptions: ILoadCoreFilesOptions = {},
): Promise<IBuildProjectFilesResult> => {
  const filesUsingUserEnv: string[] = [];
  const filesFailedToFormat: IFailedFormatEntry[] = [];
  const messages: IScaffolderMessage[] = [];

  const attachMessageSummaries = (structure: IStructure): IStructure => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ENABLE_MESSAGE_SUMMARY_FILES) {
      return structure;
    }
    if (messages.length === 0) {
      return structure;
    }
    const next = [...structure];
    const hasErrors = messages.some((message) => message.severity === 'error');
    const hasWarnings = messages.some(
      (message) => message.severity === 'warning',
    );
    const hasInfo = messages.some((message) => message.severity === 'info');

    next.push({
      type: 'file',
      name: '_MESSAGES_.md',
      content: formatMessagesAsMarkdown(messages),
    });
    next.push({
      type: 'file',
      name: '_MESSAGES_.json',
      content: formatMessagesAsJson(messages),
    });
    if (hasErrors) {
      next.push({
        type: 'file',
        name: '_ERRORS_.md',
        content: formatMessagesBySeverity(messages, 'error'),
      });
    }
    if (hasWarnings) {
      next.push({
        type: 'file',
        name: '_WARNINGS_.md',
        content: formatMessagesBySeverity(messages, 'warning'),
      });
    }
    if (hasInfo) {
      next.push({
        type: 'file',
        name: '_INFO_.md',
        content: formatMessagesBySeverity(messages, 'info'),
      });
    }

    return next;
  };

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
  const schemaInfoWithAuth = identifyAuthResources(schemaInfo);
  const schemaInfoParsed = getSchemaInfo(schemaInfoWithAuth);
  const file = findFileInStructure(projectYamlPath, userFiles);

  if (!file) {
    const message = createScaffolderMessage({
      code: SCAFFOLDER_MESSAGE_CODES.FileNotFound,
      title: 'Project specification missing',
      severity: 'error',
      details: [
        `Path: ${projectYamlPath}`,
        'Please ensure the structure.yaml exists.',
      ],
      suggestion: 'Add the requested project YAML file under /files/Projects.',
      dismissible: false,
      file: projectYamlPath,
    });
    messages.push(message);

    return {
      structure: attachMessageSummaries([
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
      ]),
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
      messages,
      hasErrors: true,
      hasWarnings: false,
    };
  }

  const circularImportCheck = detectCircularImports(projectYamlPath, userFiles);

  if (circularImportCheck.hasCircularImport) {
    const circularImportLines = circularImportCheck.cycleChain
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
    const circularImportFile = circularImportLines[0];

    const message = createScaffolderMessage({
      code: SCAFFOLDER_MESSAGE_CODES.CircularImport,
      title: 'Circular project imports detected',
      severity: 'error',
      details: ['Import chain:', circularImportCheck.cycleChain],
      suggestion:
        'Break the cycle by removing one of the IMPORT_PROJECT directives.',
      dismissible: false,
      file: circularImportFile,
    });
    messages.push(message);

    return {
      structure: attachMessageSummaries([
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
      ]),
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
      messages,
      hasErrors: true,
      hasWarnings: false,
    };
  }

  try {
    const parsedYaml: unknown = parse(file.content);

    const placeholders = extractPlaceholdersFromYaml(parsedYaml);
    const circularPlaceholderCheck =
      detectCircularPlaceholderImports(placeholders);

    if (circularPlaceholderCheck.hasCircularReference) {
      const circularPlaceholderLines = circularPlaceholderCheck.circularPath
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      const circularPlaceholderFile = circularPlaceholderLines[0];

      const message = createScaffolderMessage({
        code: SCAFFOLDER_MESSAGE_CODES.CircularPlaceholder,
        title: 'Circular placeholder reference',
        severity: 'error',
        details: ['Placeholder path:', circularPlaceholderCheck.circularPath],
        suggestion:
          'Avoid placeholders that reference each other directly or indirectly.',
        dismissible: false,
        file: circularPlaceholderFile,
      });
      messages.push(message);

      return {
        structure: attachMessageSummaries([
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
        ]),
        filesUsingUserEnv: [],
        filesFailedToFormat: [],
        messages,
        hasErrors: true,
        hasWarnings: false,
      };
    }

    const rawCoreFiles = loadCoreFiles(projectYamlPath, userFiles, coreOptions);

    // Load auth schemas if $USE_SCHEMA is specified
    const authSchema = loadSchemas(projectYamlPath, userFiles);

    // Process core files to handle template commands like USE_USER_ENV
    const coreFiles = processCoreFiles(
      rawCoreFiles,
      userFiles,
      schemaInfoWithAuth,
      formData,
      userMetadata,
      projectYamlPath,
      trackFileUsingUserEnv,
    );

    let yamlStructureToProcess: unknown = parsedYaml;
    if (
      parsedYaml !== null &&
      typeof parsedYaml === 'object' &&
      !Array.isArray(parsedYaml)
    ) {
      // Remove special directives from YAML processing
      const entries = Object.entries(parsedYaml).filter(([key, value]) => {
        if (key === 'source' && typeof value === 'string') {
          return false;
        }
        return (
          key !== '$USE_CORE' &&
          key !== '$USE_SCHEMA' &&
          key !== '$SCHEMA_FILTER' &&
          key !== '$CONFIG' &&
          key !== '$BASE' &&
          key !== '$SOURCE' &&
          key !== 'replace'
        );
      });
      yamlStructureToProcess = Object.fromEntries(entries);
    }

    // Generate mock data for seed files (camelCase for ORM compatibility)
    const mockData = generateMockData({
      mockDataRows: 10,
      schemaInfo: schemaInfoWithAuth,
      dbType: formData.dbType ?? 'postgresql',
      useCamelCase: true,
    });

    const ctx = createContext(
      userFiles,
      schemaInfoWithAuth,
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
      mockData,
      authSchema, // auth schema from $USE_SCHEMA
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

    const leftoverTemplateMarkers =
      detectLeftoverTemplateMarkers(filteredFiles);
    if (leftoverTemplateMarkers.length > 0) {
      const firstLeftoverFile = leftoverTemplateMarkers[0]?.filePath;
      const message = createScaffolderMessage({
        code: SCAFFOLDER_MESSAGE_CODES.LeftoverPlaceholder,
        title: 'Generated files still contain template markers',
        severity: 'error',
        details: leftoverTemplateMarkers.map(
          (location) => `${location.filePath}: ${location.markers.join(', ')}`,
        ),
        suggestion:
          'Wrap optional schema fields in <@@IF@@> conditions so a valid schema never leaves <@@> or <@@IF@@> tags. Leftover markers are reported before prettier so the missing replacement is visible.',
        dismissible: false,
        file: firstLeftoverFile,
      });
      messages.push(message);
    }

    if (filesFailedToFormat.length > 0) {
      const firstFailedFile = filesFailedToFormat[0]?.filePath;
      const message = createScaffolderMessage({
        code: SCAFFOLDER_MESSAGE_CODES.FormatError,
        title: 'Files failed to format',
        severity: 'error',
        details: filesFailedToFormat.map(
          (entry) => `${entry.filePath}: ${entry.errorMessage}`,
        ),
        suggestion: 'Inspect the reported files and correct formatting issues.',
        dismissible: false,
        file: firstFailedFile,
      });
      messages.push(message);
    }

    if (filesUsingUserEnv.length > 0) {
      const firstUserEnvFile = filesUsingUserEnv[0];
      const message = createScaffolderMessage({
        code: SCAFFOLDER_MESSAGE_CODES.UserEnvUsage,
        title: 'Detected USE_USER_ENV leftovers',
        severity: 'warning',
        details: filesUsingUserEnv,
        suggestion:
          'Use sanitized environment helpers or remove USE_USER_ENV directives before committing.',
        file: firstUserEnvFile,
      });
      messages.push(message);
    }

    const hasErrors = messages.some((message) => message.severity === 'error');
    const hasWarnings = messages.some(
      (message) => message.severity === 'warning',
    );

    return {
      structure: attachMessageSummaries(filteredFiles),
      filesUsingUserEnv,
      filesFailedToFormat,
      messages,
      hasErrors,
      hasWarnings,
    };
  } catch (error) {
    const message = createScaffolderMessage({
      code: SCAFFOLDER_MESSAGE_CODES.InvalidYaml,
      title: 'Unable to parse project YAML',
      severity: 'error',
      details: [String(error)],
      suggestion: 'Ensure the YAML is valid before running the generator.',
      dismissible: false,
    });
    messages.push(message);

    return {
      structure: attachMessageSummaries([
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
      ]),
      filesUsingUserEnv: [],
      filesFailedToFormat: [],
      messages,
      hasErrors: true,
      hasWarnings: false,
    };
  }
};

// Re-export utility functions for use in project store and other modules
export { updateFilesInStructure } from '@/utils/project-builder/updateFilesInStructure.ts';
