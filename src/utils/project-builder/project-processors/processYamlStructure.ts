import { checkConditions } from '@/utils/project-builder/project-processors/checkConditions.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { parseCommand } from '@/utils/project-builder/utils/parseCommand.ts';
import { parseConditionalFolder } from '@/utils/project-builder/project-processors/parseConditionalFolder.ts';
import { processDynamicFolders } from '@/utils/project-builder/project-processors/processDynamicFolders.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import { processLoopTables } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import { importProject } from '@/utils/project-builder/project-processors/importProject.ts';
import { createBaseMethodFile } from '@/utils/project-builder/project-processors/createBaseMethodFile.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { PROJECT_ACTIONS } from '@/utils/project-builder/constants/projectActions.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { IBuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { processTemplatePathWithFlag } from '@/utils/project-builder/utils/processRelativePath.ts';

export const processYamlStructure = ({
  node,
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  table,
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
        table
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
      if (!schemaInfoProcessed) {
        return [];
      }

      // When inside a dynamic folder context with --scoped flag,
      // use only the current table context rather than looping over all tables
      const scopedOption = options[ACTION_FLAGS.SCOPED];
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
          command
        );

        // Extract the base filename from the processed path if it contains slashes
        const outputFileName = processedName.includes('/')
          ? extractFileNameFromPath(processedName)
          : processedName;

        let content = '';
        content = replacePlaceholders(
          processLoopTables(
            templateContent,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
          ),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectYamlPath,
          typeof templatePath === 'string' && templatePath.length > 0 ? templatePath : command
        );

        content = processIterateInTemplate(
          content,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          table,
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

      // Process the template with all replacements
      let processedContent = replacePlaceholders(
        processLoopTables(
          templateContent,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        ),
        replacements,
        userFiles,
        schemaInfoParsed,
        schemaInfoProcessed,
        projectYamlPath,
        node
      );

      processedContent = processIterateInTemplate(
        processedContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        schemaInfoProcessed,
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
      });
    }

    // Handle bare filenames by looking for templates
    const templateContent = loadTemplateContent(
      userFiles,
      node,
      projectYamlPath,
    );
    if (templateContent.length > 0) {
      const schemaInfoProcessed =
        schemaInfo.length > 0 ? schemaInfo[0] : undefined;
      if (!schemaInfoProcessed) {
        return [];
      }

      const replacements = getReplacementsForTable(
        schemaInfoProcessed,
        schemaInfoParsed,
      );

      // Process the template content with all replacements
      let processedContent = replacePlaceholders(
        processLoopTables(
          templateContent,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        ),
        replacements,
        userFiles,
        schemaInfoParsed,
        schemaInfoProcessed,
        projectYamlPath,
      );

      processedContent = processIterateInTemplate(
        processedContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
      );

      // Format the final content with proper character replacements
      const finalContent = formatFileContent(processedContent);

      // Extract just the filename from the path
      const outputFileName = extractFileNameFromPath(node);

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
          // Get the keys of the object
          const keys = Object.keys(item);
          if (
            keys.length > 0 &&
            keys[0].startsWith(`${String(PROJECT_ACTIONS.FOLDER_LOOP)}(`)
          ) {
            const key = keys[0];
            const value = item[key];

            if (value == null) {
              return [];
            }

            // Extract folder name by removing the function name and parentheses
            const folderName = key.slice(
              String(PROJECT_ACTIONS.FOLDER_LOOP).length + 1,
              -1,
            );

            // Process the dynamic folders directly
            return processDynamicFolders({
              folderName,
              children: value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              projectYamlPath,
            });
          }
        }
      }

      // Standard processing for non-dynamic-folder items
      if (table) {
        return processYamlStructure({
          node: item,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          table,
        });
      }
      return processYamlStructure({
        node: item,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
      });
    });
  }

  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]): IStructure => {
      // Special handling for IMPORT_PROJECT keys with colons
      if (key.startsWith(`${String(PROJECT_ACTIONS.IMPORT_PROJECT)}(`)) {
        // Extract the command string
        const commandString = key.slice(
          String(PROJECT_ACTIONS.IMPORT_PROJECT).length + 1,
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
        });

        // If this is just an import without creating a folder (when it has a colon at the end)
        if (key.endsWith(':') && value !== null && typeof value === 'object') {
          // Process the value structure with the same context
          const childStructure = processYamlStructure({
            node: value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            projectYamlPath,
            table,
          });

          return [...importResult, ...childStructure];
        }

        // Return the import result directly without creating a folder
        return importResult;
      }

      // Handle conditional folders
      const { name, conditions } = parseConditionalFolder(key);
      if (conditions && !checkConditions(conditions)) {
        return [
          {
            type: 'folder',
            name: name.replace(/[()]/g, ''),
            children: [],
          },
        ];
      }

      if (key.startsWith(`${String(PROJECT_ACTIONS.FOLDER_LOOP)}(`)) {
        // Extract folder name and remove parentheses
        const folderName = key
          .slice(String(PROJECT_ACTIONS.FOLDER_LOOP).length + 1, -1)
          .replace(/[()]/g, '');
        // Return the dynamic folders directly without an extra parent folder
        return processDynamicFolders({
          folderName,
          children: value,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
        });
      }

      if (table) {
        return [
          {
            type: 'folder',
            name: name.replace(/[()]/g, ''),
            children: processYamlStructure({
              node: value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              projectYamlPath,
              table,
            }),
          },
        ];
      }

      return [
        {
          type: 'folder',
          name: name.replace(/[()]/g, ''),
          children: processYamlStructure({
            node: value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            projectYamlPath,
          }),
        },
      ];
    });
  }

  return [];
};
