import type { IStructure } from '@/components/FileViewer.tsx';
import { parseCommand } from '@/utils/project-builder/utils/parseCommand.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { parse } from 'yaml';
import type { IBuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';

/**
 * Type guard to check if a value is a valid project structure object
 */
function isValidProjectStructure(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Processes an IMPORT_PROJECT command by loading and processing a project structure
 * from another file and including it in the current structure.
 *
 * @param command The command string containing the file path to import
 * @param schemaInfo The schema information for all tables
 * @param schemaInfoParsed The parsed schema info object
 * @param userFiles The user's file structure
 * @param table Optional table context for scoped imports
 * @returns An array of structure items to be included
 */
export const importProject = async (
  ctx: IBuildContext,
): Promise<IStructure> => {
  const { command, schemaInfo, schemaInfoParsed, userFiles, table } = ctx;
  // Clean up the command string to handle cases where it might have trailing characters
  const cleanCommand = command?.trim();

  if (cleanCommand == null) {
    return [];
  }

  const { command: path, options } = parseCommand(cleanCommand);

  // Find the imported project file in the structure using the existing utility
  const projectFile = findFileInStructure(path, userFiles);

  if (!projectFile) {
    return [];
  }

  // Try to parse the project structure from the file
  try {
    // Parse the YAML file content with unknow type first
    const parsedContent: unknown = parse(projectFile.content);

    // Check that the parsed content is a valid object using type guard
    if (!isValidProjectStructure(parsedContent)) {
      return [];
    }

    // Now we can safely use the validated object
    const parsedYaml: Record<string, unknown> = parsedContent;

    const importedProjectPath = path;

    const scopedOption = options[ACTION_FLAGS.SCOPED] === true;
    const includeTableOption = options[ACTION_FLAGS.INCLUDE_TABLE];
    const excludeTableOption = options[ACTION_FLAGS.EXCLUDE_TABLE];

    if (table && scopedOption) {
      return await processYamlStructure({
        ...ctx,
        node: parsedYaml,
        projectYamlPath: importedProjectPath,
      });
    } else if (
      (includeTableOption != null && includeTableOption.trim().length > 0) ||
      (excludeTableOption != null && excludeTableOption.trim().length > 0)
    ) {
      // Apply table filtering
      const filteredResults: IStructure = [];

      for (const currentTable of schemaInfo) {
        const replacements = getReplacementsForTable(
          currentTable,
          schemaInfoParsed,
        );

        // Check include filter
        if (
          includeTableOption != null &&
          includeTableOption.trim().length > 0
        ) {
          const processedIncludeTable = replacePlaceholders(
            String(options[ACTION_FLAGS.INCLUDE_TABLE]),
            replacements,
            { ...ctx, table: currentTable },
          );
          if (currentTable.tableName !== processedIncludeTable) {
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
            { ...ctx, table: currentTable },
          );
          if (currentTable.tableName === processedExcludeTable) {
            continue;
          }
        }

        const processedStructure = await processYamlStructure({
          ...ctx,
          node: parsedYaml,
          projectYamlPath: importedProjectPath,
          table: currentTable,
        });

        filteredResults.push(...processedStructure);
      }

      return filteredResults;
    }

    return await processYamlStructure({
      ...ctx,
      node: parsedYaml,
      projectYamlPath: importedProjectPath,
    });
  } catch {
    return [];
  }
};
