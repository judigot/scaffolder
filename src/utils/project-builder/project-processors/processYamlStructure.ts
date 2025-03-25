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
import { processLoopTables } from '@/utils/project-builder/template-processors/processLoopTables.ts';
import { processMultipleFiles } from '@/utils/project-builder/project-processors/processMultipleFiles.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { PROJECT_ACTIONS } from '@/utils/project-builder/constants/projectActions.ts';

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
      const conditions = options.conditions;
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
      if (table && (options.useRelatedTable ?? false)) {
        // First check if the current table has relationships
        const hasRelationships =
          [
            ...(table.hasMany ?? []),
            ...(table.hasOne ?? []),
            ...(table.belongsTo ?? []),
            ...(table.belongsToMany ?? []),
          ].length > 0;

        // Skip if there are no relationships
        if (!hasRelationships) {
          return [];
        }

        // Get the template content
        let templateContent = '';
        if (
          typeof options.template === 'string' &&
          options.template.trim().length > 0
        ) {
          const loadedContent = loadTemplateContent(
            userFiles,
            options.template,
          );
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
          {
            ...replacements,
            modelSpecificRoutes: options.modelSpecificRoutes ?? '',
            baseRoutesForController: options.baseRoutesForController ?? '',
          },
          userFiles,
          schemaInfoParsed,
          table,
        );

        // Process ITERATE commands
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

      // Apply table filtering for CREATE_FILE
      if (
        (options.includeTable !== undefined &&
          options.includeTable.trim().length > 0) ||
        (options.excludeTable !== undefined &&
          options.excludeTable.trim().length > 0) ||
        Boolean(options.useRelatedTable)
      ) {
        const filteredResults: IStructure = [];

        for (const table of schemaInfo) {
          const replacements = getReplacementsForTable(table, schemaInfoParsed);

          // Check include filter
          if (
            options.includeTable !== undefined &&
            options.includeTable.trim().length > 0
          ) {
            const processedIncludeTable = replacePlaceholders(
              String(options.includeTable),
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
            options.excludeTable !== undefined &&
            options.excludeTable.trim().length > 0
          ) {
            const processedExcludeTable = replacePlaceholders(
              String(options.excludeTable),
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
          const templateContent = loadTemplateContent(
            userFiles,
            options.template ?? processedName,
          );

          // Process the template with all replacements
          let processedContent = replacePlaceholders(
            processLoopTables(
              templateContent,
              schemaInfo,
              schemaInfoParsed,
              userFiles,
            ),
            {
              ...replacements,
              modelSpecificRoutes: options.modelSpecificRoutes ?? '',
              baseRoutesForController: options.baseRoutesForController ?? '',
            },
            userFiles,
            schemaInfoParsed,
            table,
          );

          // Process ITERATE commands explicitly
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
      const templateContent = loadTemplateContent(
        userFiles,
        options.template ?? processedName,
      );

      // Process the template with all replacements
      let processedContent = replacePlaceholders(
        processLoopTables(
          templateContent,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        ),
        {
          ...replacements,
          modelSpecificRoutes: options.modelSpecificRoutes ?? '',
          baseRoutesForController: options.baseRoutesForController ?? '',
        },
        userFiles,
        schemaInfoParsed,
        schemaInfoProcessed,
      );

      // Process ITERATE commands explicitly
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

    if (node.startsWith(`${PROJECT_ACTIONS.CREATE_MULTIPLE_FILES}(`)) {
      const { command, options } = parseCommand(
        node.slice(PROJECT_ACTIONS.CREATE_MULTIPLE_FILES.length + 1, -1),
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

      // Process ITERATE commands explicitly
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
      // Check if the array item is an object with a CREATE_DYNAMIC_FOLDERS key
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Define type predicate for Record
        const isRecordWithDynamicFolder = (
          obj: unknown,
        ): obj is Record<string, unknown> =>
          typeof obj === 'object' && obj !== null && !Array.isArray(obj);

        if (isRecordWithDynamicFolder(item)) {
          // Get the keys of the object
          const keys = Object.keys(item);
          // Check if the first (and likely only) key is a CREATE_DYNAMIC_FOLDERS command
          if (
            keys.length > 0 &&
            keys[0].startsWith(
              `${String(PROJECT_ACTIONS.CREATE_DYNAMIC_FOLDERS)}(`,
            )
          ) {
            const key = keys[0];
            const value = item[key];

            // Extract folder name by removing the function name and parentheses
            const folderName = key.slice(
              String(PROJECT_ACTIONS.CREATE_DYNAMIC_FOLDERS).length + 1,
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

      if (
        key.startsWith(`${String(PROJECT_ACTIONS.CREATE_DYNAMIC_FOLDERS)}(`)
      ) {
        // Extract folder name and remove parentheses
        const folderName = key
          .slice(String(PROJECT_ACTIONS.CREATE_DYNAMIC_FOLDERS).length + 1, -1)
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
