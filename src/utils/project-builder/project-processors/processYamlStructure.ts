import { checkConditions } from '@/utils/project-builder/project-processors/checkConditions.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { parseCommand } from '@/utils/project-builder/utils/parseCommand.ts';
import { parseConditionalFolder } from '@/utils/project-builder/project-processors/parseConditionalFolder.ts';
import { processDynamicFolders } from '@/utils/project-builder/project-processors/processDynamicFolders.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import {
  processLoopTables,
  processLoopDataSources,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import { processLoopFolders } from '@/utils/project-builder/project-processors/processLoopFolders.ts';
import { importProject } from '@/utils/project-builder/project-processors/importProject.ts';
import { createBaseMethodFile } from '@/utils/project-builder/project-processors/createBaseMethodFile.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { PROJECT_ACTIONS } from '@/utils/project-builder/constants/projectActions.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import type { IBuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { processTemplatePathWithFlag } from '@/utils/project-builder/utils/processRelativePath.ts';
import { flattenData } from '@/utils/project-builder/utils/dataSourceUtils.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

const ROOT_LEVEL_ACTIONS = [
  PROJECT_ACTIONS.CREATE_FILE,
  PROJECT_ACTIONS.CREATE_BASE_METHOD_FILE,
  PROJECT_ACTIONS.FILE_LOOP,
  PROJECT_ACTIONS.LOOP_FOLDERS,
] as const;

const buildAbsolutePath = (fileName: string, currentPath: string): string => {
  if (currentPath === '') {
    return fileName;
  }
  return `${currentPath}/${fileName}`;
};

export const processYamlStructure = ({
  node,
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  table,
  formData,
  userMetadata,
  dataContext,
  onFileUsingUserEnv,
  currentPath = '',
}: IBuildContext): IStructure => {
  if (typeof node === 'string') {
    const nodeParams = /\(([^)]+)\)/.exec(node);

    if (!nodeParams) {
      throw new Error('No node params found');
    }

    const extractedParams = nodeParams[1];

    const { command, options } = parseCommand(extractedParams);

    let templatePath = options[ACTION_FLAGS.TEMPLATE];

    // Check if the template path is marked as relative and present
    const hasRelativeTemplatePath =
      ACTION_FLAGS.IS_RELATIVE_PATH in options &&
      options[ACTION_FLAGS.IS_RELATIVE_PATH] === true &&
      typeof templatePath === 'string';

    // Process the template path if it's marked as relative
    if (hasRelativeTemplatePath) {
      templatePath = processTemplatePathWithFlag(
        templatePath,
        projectYamlPath,
        true,
      );
    }

    if (node.startsWith(`${PROJECT_ACTIONS.CREATE_BASE_METHOD_FILE}(`)) {
      // Skip file if conditions are not met
      const conditions = options[ACTION_FLAGS.CONDITIONS];
      if (conditions && conditions.length > 0 && !checkConditions(conditions)) {
        return [];
      }
      return createBaseMethodFile(
        extractedParams,
        userFiles,
        projectYamlPath,
        schemaInfo,
        schemaInfoParsed,
        table,
      );
    }

    if (node.startsWith(`${PROJECT_ACTIONS.CREATE_FILE}(`)) {
      // Skip file if conditions are not met
      const conditions = options[ACTION_FLAGS.CONDITIONS];
      if (conditions && conditions.length > 0 && !checkConditions(conditions)) {
        return [];
      }

      const schemaInfoProcessed =
        schemaInfo.length > 0 ? schemaInfo[0] : undefined;

      const scopedOption = options[ACTION_FLAGS.SCOPED];

      if (dataContext && (scopedOption ?? false)) {
        let templateContent = '';
        if (
          typeof templatePath === 'string' &&
          templatePath.trim().length > 0
        ) {
          const loadedContent = loadTemplateContent(
            userFiles,
            templatePath,
            projectYamlPath,
          );
          if (loadedContent.length > 0) {
            templateContent = loadedContent;
          }
        } else {
          templateContent = loadTemplateContent(
            userFiles,
            command,
            projectYamlPath,
          );
        }

        const flattenedData = flattenData(dataContext);
        const dataReplacements: Record<string, string> = {};
        for (const [key, value] of Object.entries(flattenedData)) {
          dataReplacements[key] = value;
        }

        const processedName = replacePlaceholders(
          command,
          dataReplacements,
          userFiles,
          schemaInfoParsed,
          undefined,
          projectYamlPath,
          command,
          formData,
          userMetadata,
          dataContext,
        );

        const outputFileName = processedName.includes('/')
          ? extractFileNameFromPath(processedName)
          : processedName;

        if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
          onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
        }

        const content = replacePlaceholders(
          templateContent,
          dataReplacements,
          userFiles,
          schemaInfoParsed,
          undefined,
          projectYamlPath,
          typeof templatePath === 'string' && templatePath.length > 0
            ? templatePath
            : command,
          formData,
          userMetadata,
          dataContext,
        );

        const finalContent = formatFileContent(content);

        return [
          {
            type: 'file',
            name: outputFileName,
            content: finalContent,
          },
        ];
      }

      if (!schemaInfoProcessed) {
        return [];
      }

      if (table && (scopedOption ?? false)) {
        // The hasRelationships check is removed here to allow processing of all tables

        // Get the template content
        let templateContent = '';
        if (
          typeof templatePath === 'string' &&
          templatePath.trim().length > 0
        ) {
          const loadedContent = loadTemplateContent(
            userFiles,
            templatePath,
            projectYamlPath,
          );
          if (loadedContent.length > 0) {
            templateContent = loadedContent;
          }
        } else {
          // Try to load template based on filename if no template option provided
          templateContent = loadTemplateContent(
            userFiles,
            command,
            projectYamlPath,
          );
        }

        // Process the file with the current table context only
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedName = replacePlaceholders(
          command,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectYamlPath,
          command,
          formData,
          userMetadata,
          undefined,
        );

        // Extract the base filename from the processed path if it contains slashes
        const outputFileName = processedName.includes('/')
          ? extractFileNameFromPath(processedName)
          : processedName;

        if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
          onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
        }

        let content = '';
        content = replacePlaceholders(
          processLoopDataSources(
            processLoopTables(
              templateContent,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              formData,
              userMetadata,
            ),
            userFiles,
            schemaInfoParsed,
            formData,
            userMetadata,
          ),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectYamlPath,
          typeof templatePath === 'string' && templatePath.length > 0
            ? templatePath
            : command,
          formData,
          userMetadata,
          undefined,
        );

        content = processIterateInTemplate(
          content,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          table,
          formData,
          userMetadata,
        );

        // Format with consistent character handling
        const finalContent = formatFileContent(content);

        return [
          {
            type: 'file',
            name: outputFileName,
            content: finalContent,
          },
        ];
      }

      // Original behavior for backward compatibility (no include/exclude filters)
      const replacements = getReplacementsForTable(
        schemaInfoProcessed,
        schemaInfoParsed,
      );
      const processedName = replacePlaceholders(
        command,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
        projectYamlPath,
        undefined,
        formData,
        userMetadata,
        undefined,
      );

      // Extract just the filename portion if it contains slashes
      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName.replace(/[()]/g, '');

      // Load and process template content
      const templateContent = loadTemplateContent(
        userFiles,
        templatePath ?? processedName,
        projectYamlPath,
      );

      // Check if template uses USE_USER_ENV BEFORE processing
      // This detects usage even if the pattern gets replaced successfully
      if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
        onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
      }

      let processedContent = replacePlaceholders(
        processLoopDataSources(
          processLoopTables(
            templateContent,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            formData,
            userMetadata,
          ),
          userFiles,
          schemaInfoParsed,
          formData,
          userMetadata,
        ),
        replacements,
        userFiles,
        schemaInfoParsed,
        schemaInfoProcessed,
        projectYamlPath,
        node,
        formData,
        userMetadata,
        undefined,
      );

      processedContent = processIterateInTemplate(
        processedContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        schemaInfoProcessed,
        formData,
        userMetadata,
      );

      // Format the final content with proper character replacements
      const finalContent = formatFileContent(processedContent);

      return [
        {
          type: 'file',
          name: outputFileName,
          content: finalContent,
        },
      ];
    }

    if (node.startsWith(`${PROJECT_ACTIONS.IMPORT_PROJECT}(`)) {
      return importProject({
        command,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
        table,
        formData,
        userMetadata,
        onFileUsingUserEnv,
        currentPath,
      });
    }

    if (node.startsWith(`${PROJECT_ACTIONS.FILE_LOOP}(`)) {
      return processMultipleFiles({
        command,
        options,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
        formData,
        userMetadata,
        onFileUsingUserEnv,
        currentPath,
      });
    }

    if (node.startsWith(`${PROJECT_ACTIONS.LOOP_FOLDERS}(`)) {
      return processLoopFolders({
        command,
        options,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
        formData,
        userMetadata,
      });
    }

    // Handle bare filenames by looking for templates
    const templateContent = loadTemplateContent(
      userFiles,
      node,
      projectYamlPath,
    );
    if (templateContent.length > 0) {
      // Extract filename from node (could be a path or just filename)
      const outputFileName = extractFileNameFromPath(node);

      // Check if template uses USE_USER_ENV BEFORE processing
      if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
        onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
      }

      const schemaInfoProcessed =
        schemaInfo.length > 0 ? schemaInfo[0] : undefined;
      if (!schemaInfoProcessed) {
        return [];
      }

      const replacements = getReplacementsForTable(
        schemaInfoProcessed,
        schemaInfoParsed,
      );

      let processedContent = replacePlaceholders(
        processLoopDataSources(
          processLoopTables(
            templateContent,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            formData,
            userMetadata,
          ),
          userFiles,
          schemaInfoParsed,
          formData,
          userMetadata,
        ),
        replacements,
        userFiles,
        schemaInfoParsed,
        schemaInfoProcessed,
        projectYamlPath,
        undefined,
        formData,
        userMetadata,
        undefined,
      );

      processedContent = processIterateInTemplate(
        processedContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
        formData,
        userMetadata,
      );

      // Format the final content with proper character replacements
      const finalContent = formatFileContent(processedContent);

      return [
        {
          type: 'file',
          name: outputFileName,
          content: finalContent,
        },
      ];
    }

    return [
      {
        type: 'file',
        name: node,
        content: '',
      },
    ];
  }

  if (Array.isArray(node)) {
    return node.flatMap((item) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Define type predicate for Record
        const isRecordWithDynamicFolder = (
          obj: unknown,
        ): obj is Record<string, unknown> =>
          typeof obj === 'object' && obj !== null && !Array.isArray(obj);

        if (isRecordWithDynamicFolder(item)) {
          const keys = Object.keys(item);
          if (
            keys.length > 0 &&
            keys[0].startsWith(`${PROJECT_ACTIONS.FOLDER_LOOP}(`)
          ) {
            const key = keys[0];
            const value = item[key];

            if (value == null) {
              return [];
            }

            const folderLoopParams = key.slice(
              PROJECT_ACTIONS.FOLDER_LOOP.length + 1,
              -1,
            );
            const { command: folderName, options: folderOptions } =
              parseCommand(folderLoopParams);

            return processDynamicFolders({
              folderName,
              children: value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              projectYamlPath,
              formData,
              userMetadata,
              options: {
                ...folderOptions,
                onFileUsingUserEnv,
              },
              currentPath,
            });
          }
        }
      }

      if (table) {
        return processYamlStructure({
          node: item,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          table,
          formData,
          userMetadata,
          dataContext,
          onFileUsingUserEnv,
          currentPath,
        });
      }
      return processYamlStructure({
        node: item,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
        formData,
        userMetadata,
        dataContext,
        onFileUsingUserEnv,
        currentPath,
      });
    });
  }

  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]): IStructure => {
      if (ROOT_LEVEL_ACTIONS.some((action) => key.startsWith(`${action}(`))) {
        const actionResult = processYamlStructure({
          node: key,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          table,
          formData,
          userMetadata,
          dataContext,
          onFileUsingUserEnv,
          currentPath,
        });

        if (value !== null && value !== undefined) {
          const childStructure = processYamlStructure({
            node: value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            projectYamlPath,
            table,
            formData,
            userMetadata,
            dataContext,
            onFileUsingUserEnv,
            currentPath,
          });

          return [...actionResult, ...childStructure];
        }

        return actionResult;
      }

      // Special handling for IMPORT_PROJECT keys with colons
      if (key.startsWith(`${PROJECT_ACTIONS.IMPORT_PROJECT}(`)) {
        // Extract the command string
        const commandString = key.slice(
          PROJECT_ACTIONS.IMPORT_PROJECT.length + 1,
          key.length - (key.endsWith(':') ? 2 : 1), // Remove both the closing parenthesis and colon if present
        );

        // Process the import
        const importResult = importProject({
          command: commandString,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          table,
          formData,
          userMetadata,
          onFileUsingUserEnv,
          currentPath,
        });

        if (key.endsWith(':') && value !== null && typeof value === 'object') {
          const childStructure = processYamlStructure({
            node: value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            projectYamlPath,
            table,
            formData,
            userMetadata,
            dataContext,
            onFileUsingUserEnv,
            currentPath,
          });

          return [...importResult, ...childStructure];
        }

        // Return the import result directly without creating a folder
        return importResult;
      }

      // Handle conditional folders
      const { name, conditions } = parseConditionalFolder(key);
      const folderName = name.replace(/[()]/g, '');
      const newPath =
        currentPath === '' ? folderName : `${currentPath}/${folderName}`;

      if (conditions && !checkConditions(conditions)) {
        return [
          {
            type: 'folder',
            name: folderName,
            children: [],
          },
        ];
      }

      if (key.startsWith(`${PROJECT_ACTIONS.FOLDER_LOOP}(`)) {
        const folderLoopParams = key.slice(
          PROJECT_ACTIONS.FOLDER_LOOP.length + 1,
          -1,
        );
        const { command: folderName, options: folderOptions } =
          parseCommand(folderLoopParams);

        return processDynamicFolders({
          folderName,
          children: value,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          formData,
          userMetadata,
          options: {
            ...folderOptions,
            onFileUsingUserEnv,
          },
          currentPath,
        });
      }

      // Handle case where value is a string (template path) - e.g., "app.php: /Templates/..."
      if (typeof value === 'string') {
        const templateContent = loadTemplateContent(
          userFiles,
          value,
          projectYamlPath,
        );
        if (templateContent.length > 0) {
          const outputFileName = folderName;

          // Check if template uses USE_USER_ENV BEFORE processing
          if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
            onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
          }

          const schemaInfoProcessed =
            schemaInfo.length > 0 ? schemaInfo[0] : undefined;
          if (!schemaInfoProcessed) {
            return [
              {
                type: 'file',
                name: outputFileName,
                content: '',
              },
            ];
          }

          const replacements = getReplacementsForTable(
            schemaInfoProcessed,
            schemaInfoParsed,
          );

          let processedContent = replacePlaceholders(
            processLoopDataSources(
              processLoopTables(
                templateContent,
                schemaInfo,
                schemaInfoParsed,
                userFiles,
                formData,
                userMetadata,
              ),
              userFiles,
              schemaInfoParsed,
              formData,
              userMetadata,
            ),
            replacements,
            userFiles,
            schemaInfoParsed,
            schemaInfoProcessed,
            projectYamlPath,
            undefined,
            formData,
            userMetadata,
            undefined,
          );

          processedContent = processIterateInTemplate(
            processedContent,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            table,
            formData,
            userMetadata,
          );

          const finalContent = formatFileContent(processedContent);

          return [
            {
              type: 'file',
              name: outputFileName,
              content: finalContent,
            },
          ];
        }
      }

      if (table) {
        return [
          {
            type: 'folder',
            name: folderName,
            children: processYamlStructure({
              node: value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              projectYamlPath,
              table,
              formData,
              userMetadata,
              dataContext,
              onFileUsingUserEnv,
              currentPath: newPath,
            }),
          },
        ];
      }

      return [
        {
          type: 'folder',
          name: folderName,
          children: processYamlStructure({
            node: value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            projectYamlPath,
            formData,
            userMetadata,
            dataContext,
            onFileUsingUserEnv,
            currentPath: newPath,
          }),
        },
      ];
    });
  }

  return [];
};
