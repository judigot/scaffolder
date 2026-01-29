import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';

/**
 * Filter out view tables from schema info.
 *
 * This is the centralized function used throughout the project-builder to exclude
 * view tables from code generation. Views are read-only database objects that don't
 * need migrations, controllers, models, or other generated code.
 *
 * Uses the centralized `getViewTables()` function from `getSchemaInfo.ts` for
 * consistent view detection across the entire codebase.
 *
 * **Performance**: Uses Set-based lookup for O(1) view table name checks.
 *
 * **Usage**: This function is used in:
 * - `processMultipleFiles.ts` (FILE_LOOP action)
 * - `processDynamicFolders.ts` (FOLDER_LOOP action)
 * - `processIterateCommand.ts` (LOOP template commands)
 *
 * @param schemaInfo - Array of schema info tables (may include views)
 * @param schemaInfoParsed - Parsed schema info result with `getViewTables()` method
 * @returns Filtered array containing only base tables (excluding views)
 *
 * @example
 * ```typescript
 * const schemaInfoParsed = getSchemaInfo(schemaInfo);
 * const baseTablesOnly = filterViewTables(schemaInfo, schemaInfoParsed);
 * // baseTablesOnly will not include any tables with viewQuery defined
 * ```
 */
export const filterViewTables = (
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
): ISchemaInfo[] => {
  const viewTables = schemaInfoParsed.getViewTables();
  const viewTableNames = new Set(viewTables.map((view) => view.tableName));

  return schemaInfo.filter((table) => !viewTableNames.has(table.tableName));
};
