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

export const processYamlNodeWithContext = (
  node: unknown,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  table: ISchemaInfo,
): IStructure => {
  if (typeof node === 'string') {
    if (node.startsWith('CREATE_FILE(')) {
      const { command, options } = parseCommand(node.slice(12, -1));

      // Skip file if conditions are not met
      const conditions = options.conditions;
      if (conditions && conditions.length > 0 && !checkConditions(conditions)) {
        return [];
      }

      const schemaInfoProcessed =
        schemaInfo.length > 0 ? schemaInfo[0] : undefined;
      if (!schemaInfoProcessed) {
        console.warn('No schema information available for replacements.');
        return [];
      }

      // Apply table filtering for CREATE_FILE
      if (
        (options.includeTable !== undefined &&
          options.includeTable.trim().length > 0) ||
        (options.excludeTable !== undefined &&
          options.excludeTable.trim().length > 0) ||
        options.useRelatedTable === true
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
              console.warn(
                `Skipping CREATE_FILE for table ${String(table.tableName)}: doesn't match include filter ${String(processedIncludeTable)}`,
              );
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
              console.warn(
                `Skipping CREATE_FILE for table ${String(table.tableName)}: matches exclude filter ${String(processedExcludeTable)}`,
              );
              continue;
            }
          }

          // Check useRelatedTable flag
          if (options.useRelatedTable === true) {
            // Check for related tables in any of the relationship types
            const hasRelationships =
              [
                ...(table.hasMany ?? []),
                ...(table.hasOne ?? []),
                ...(table.belongsTo ?? []),
                ...(table.belongsToMany ?? []),
              ].length > 0;

            // Skip if there are no relationships
            if (!hasRelationships) {
              console.warn(
                `Skipping CREATE_FILE for table ${String(table.tableName)}: has no relationships`,
              );
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
            replacements,
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
    if (node.startsWith('CREATE_RELATED_FILE(')) {
      const { command, options } = parseCommand(node.slice(19, -1));

      // When inside a dynamic folder context (processYamlNodeWithContext) with --use-related-table flag,
      // use only the current table context rather than looping over all tables
      if (options.useRelatedTable ?? false) {
        // First check if the current table has relationships if that's required
        const hasRelationships =
          [
            ...(table.hasMany ?? []),
            ...(table.hasOne ?? []),
            ...(table.belongsTo ?? []),
            ...(table.belongsToMany ?? []),
          ].length > 0;

        // Skip if there are no relationships
        if (!hasRelationships) {
          console.warn(
            `Skipping ${String(command)} for table ${String(table.tableName)}: has no relationships`,
          );
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

      // Skip generation if the current table doesn't match include table filter
      if (
        options.includeTable !== undefined &&
        options.includeTable.trim().length > 0
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedIncludeTable = replacePlaceholders(
          String(options.includeTable),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );

        if (table.tableName !== processedIncludeTable) {
          console.warn(
            `Skipping ${String(command)} for table ${String(table.tableName)}: doesn't match include filter ${String(processedIncludeTable)}`,
          );
          return [];
        }
      }

      // Check useRelatedTable flag (legacy behavior outside dynamic folders)
      // Check for related tables in any of the relationship types
      const hasRelationships =
        [
          ...(table.hasMany ?? []),
          ...(table.hasOne ?? []),
          ...(table.belongsTo ?? []),
          ...(table.belongsToMany ?? []),
        ].length > 0;

      // Skip if there are no relationships
      if (!hasRelationships) {
        console.warn(
          `Skipping ${String(command)} for table ${String(table.tableName)}: has no relationships`,
        );
        return [];
      }

      // Skip generation if the current table matches exclude table filter
      if (
        options.excludeTable !== undefined &&
        options.excludeTable.trim().length > 0
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedExcludeTable = replacePlaceholders(
          String(options.excludeTable),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );

        if (table.tableName === processedExcludeTable) {
          console.warn(
            `Skipping ${String(command)} for table ${String(table.tableName)}: matches exclude filter ${String(processedExcludeTable)}`,
          );
          return [];
        }
      }
    }
    if (node.startsWith('CREATE_MULTIPLE_FILES(')) {
      const { command, options } = parseCommand(node.slice(21, -1));
      return processMultipleFiles(
        command,
        options,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
      );
    }
    if (node.startsWith('@LOOP_TABLES(')) {
      return [
        {
          type: 'file',
          name: 'template.tmp',
          content: `@loop: tables\n${node}`,
        },
      ];
    }

    // Handle bare filenames by looking for templates
    const templateContent = loadTemplateContent(userFiles, node);
    if (templateContent.length > 0) {
      const schemaInfoProcessed =
        schemaInfo.length > 0 ? schemaInfo[0] : undefined;
      if (!schemaInfoProcessed) {
        console.warn('No schema information available for replacements.');
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
    return node.flatMap((item) =>
      processYamlNodeWithContext(
        item,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
      ),
    );
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

      if (key.startsWith('CREATE_DYNAMIC_FOLDERS(')) {
        // Extract folder name and remove parentheses
        const folderName = key.slice(22, -1).replace(/[()]/g, '');
        // Return the dynamic folders directly without an extra parent folder
        return processDynamicFolders(
          folderName,
          value,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        );
      }

      return [
        {
          type: 'folder',
          name: name.replace(/[()]/g, ''),
          children: processYamlNodeWithContext(
            value,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            table,
          ),
        },
      ];
    });
  }

  return [];
};
