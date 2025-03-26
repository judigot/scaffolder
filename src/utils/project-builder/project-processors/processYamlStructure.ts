import { checkConditions } from '@/utils/project-builder/project-processors/checkConditions.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { parseCommand } from '@/utils/project-builder/utils/parseCommand.ts';
import { parseConditionalFolder } from '@/utils/project-builder/project-processors/parseConditionalFolder.ts';
import { processDynamicFolders } from '@/utils/project-builder/project-processors/processDynamicFolders.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import { processLoopTables } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import { importProject } from '@/utils/project-builder/project-processors/importProject.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { PROJECT_ACTIONS } from '@/utils/project-builder/constants/projectActions.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';

export const processYamlStructure = (
  node: unknown,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  table?: ISchemaInfo,
): IStructure => {
  if (typeof node === 'string') {
    if (node.startsWith(`${PROJECT_ACTIONS.CREATE_FILE}(`)) {
      const { command, options } = parseCommand(
        node.slice(PROJECT_ACTIONS.CREATE_FILE.length + 1, -1),
      );

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
        const templateOption = options[ACTION_FLAGS.TEMPLATE];
        if (
          typeof templateOption === 'string' &&
          templateOption.trim().length > 0
        ) {
          const loadedContent = loadTemplateContent(userFiles, templateOption);
          if (loadedContent.length > 0) {
            templateContent = loadedContent;
          }
        } else {
          // Try to load template based on filename if no template option provided
          templateContent = loadTemplateContent(userFiles, command);
        }

        // Process the file with the current table context only
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedName = replacePlaceholders(
          command,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
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
      const includeTableOption = options[ACTION_FLAGS.INCLUDE_TABLE];
      const excludeTableOption = options[ACTION_FLAGS.EXCLUDE_TABLE];

      // Apply table filtering for CREATE_FILE
      if (
        (includeTableOption != null && includeTableOption.trim().length > 0) ||
        (excludeTableOption != null && excludeTableOption.trim().length > 0) ||
        Boolean(options[ACTION_FLAGS.SCOPED])
      ) {
        const filteredResults: IStructure = [];

        for (const table of schemaInfo) {
          const replacements = getReplacementsForTable(table, schemaInfoParsed);

          // Check include filter
          if (
            includeTableOption != null &&
            includeTableOption.trim().length > 0
          ) {
            const processedIncludeTable = replacePlaceholders(
              String(options[ACTION_FLAGS.INCLUDE_TABLE]),
              replacements,
              userFiles,
              schemaInfoParsed,
              table,
            );
            if (table.tableName !== processedIncludeTable) {
              continue;
            }
          }

          // Check exclude filter
          if (
            excludeTableOption != null &&
            excludeTableOption.trim().length > 0
          ) {
            const processedExcludeTable = replacePlaceholders(
              String(options[ACTION_FLAGS.EXCLUDE_TABLE]),
              replacements,
              userFiles,
              schemaInfoParsed,
              table,
            );
            if (table.tableName === processedExcludeTable) {
              continue;
            }
          }

          const processedName = replacePlaceholders(
            command,
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
          const outputFileName = processedName.includes('/')
            ? extractFileNameFromPath(processedName)
            : processedName.replace(/[()]/g, '');

          // Load and process template content
          const templateOption = options[ACTION_FLAGS.TEMPLATE];
          const templateContent = loadTemplateContent(
            userFiles,
            templateOption ?? processedName,
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
            table,
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

          filteredResults.push({
            type: 'file',
            name: outputFileName,
            content: finalContent,
          });
        }

        return filteredResults;
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
      );

      // Extract just the filename portion if it contains slashes
      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName.replace(/[()]/g, '');

      // Load and process template content
      const templateOption = options[ACTION_FLAGS.TEMPLATE];
      const templateContent = loadTemplateContent(
        userFiles,
        templateOption ?? processedName,
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
      // Extract the command string, removing the IMPORT_PROJECT prefix and closing parenthesis
      const commandString = node.slice(PROJECT_ACTIONS.IMPORT_PROJECT.length + 1, -1);
      return importProject(
        commandString,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
      );
    }

    if (node.startsWith(`${PROJECT_ACTIONS.FILE_LOOP}(`)) {
      const { command, options } = parseCommand(
        node.slice(PROJECT_ACTIONS.FILE_LOOP.length + 1, -1),
      );

      return processMultipleFiles(
        command,
        options,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
      );
    }

    // Handle bare filenames by looking for templates
    const templateContent = loadTemplateContent(userFiles, node);
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
            keys[0].startsWith(`${String(PROJECT_ACTIONS.FOR_EACH_TABLE)}(`)
          ) {
            const key = keys[0];
            const value = item[key];

            // Extract folder name by removing the function name and parentheses
            const folderName = key.slice(
              String(PROJECT_ACTIONS.FOR_EACH_TABLE).length + 1,
              -1,
            );

            // Process the dynamic folders directly
            return processDynamicFolders(
              folderName,
              value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
            );
          }
        }
      }

      // Standard processing for non-dynamic-folder items
      if (table) {
        return processYamlStructure(
          item,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          table,
        );
      }
      return processYamlStructure(
        item,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
      );
    });
  }

  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]): IStructure => {
      // Special handling for IMPORT_PROJECT keys with colons
      if (key.startsWith(`${String(PROJECT_ACTIONS.IMPORT_PROJECT)}(`)) {
        // Extract the command string
        const commandString = key.slice(
          String(PROJECT_ACTIONS.IMPORT_PROJECT).length + 1, 
          key.length - (key.endsWith(':') ? 2 : 1)  // Remove both the closing parenthesis and colon if present
        );
        
        // Process the import
        const importResult = importProject(
          commandString,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          table
        );
        
        // If this is just an import without creating a folder (when it has a colon at the end)
        if (key.endsWith(':') && value !== null && typeof value === 'object') {
          // Process the value structure with the same context
          const childStructure = processYamlStructure(
            value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            table
          );
          
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

      if (key.startsWith(`${String(PROJECT_ACTIONS.FOR_EACH_TABLE)}(`)) {
        // Extract folder name and remove parentheses
        const folderName = key
          .slice(String(PROJECT_ACTIONS.FOR_EACH_TABLE).length + 1, -1)
          .replace(/[()]/g, '');
        // Return the dynamic folders directly without an extra parent folder
        return processDynamicFolders(
          folderName,
          value,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        );
      }

      if (table) {
        return [
          {
            type: 'folder',
            name: name.replace(/[()]/g, ''),
            children: processYamlStructure(
              value,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
              table,
            ),
          },
        ];
      }

      return [
        {
          type: 'folder',
          name: name.replace(/[()]/g, ''),
          children: processYamlStructure(
            value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
          ),
        },
      ];
    });
  }

  return [];
};
