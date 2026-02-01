import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

export interface IValidationError {
  table: string;
  property: string;
  value: string;
  message: string;
}

/**
 * Helper to validate an array of table references
 */
function validateTableRefs(
  errors: IValidationError[],
  tableName: string,
  propertyName: string,
  refs: string[] | undefined,
  validTableNames: Set<string>,
): void {
  if (!refs) {
    return;
  }
  for (const ref of refs) {
    if (!validTableNames.has(ref)) {
      errors.push({
        table: tableName,
        property: propertyName,
        value: ref,
        message: `Table '${ref}' does not exist in schema`,
      });
    }
  }
}

/**
 * Helper to validate a column reference
 */
function validateColumnRef(
  errors: IValidationError[],
  tableName: string,
  propertyName: string,
  ref: string | undefined,
  validColumnNames: Set<string>,
): void {
  if (ref === undefined || ref === '') {
    return;
  }
  if (!validColumnNames.has(ref)) {
    errors.push({
      table: tableName,
      property: propertyName,
      value: ref,
      message: `Column '${ref}' does not exist in ${tableName}.columnsInfo`,
    });
  }
}

/**
 * Validates semantic consistency of schemaInfo.
 *
 * Checks that all references (table names, column names) actually exist.
 * When adding new reference properties to ISchemaInfo, add validation here.
 *
 * @param schemaInfo - The schema to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateSchemaInfo(
  schemaInfo: ISchemaInfo[],
): IValidationError[] {
  const errors: IValidationError[] = [];
  const tableNames = new Set(schemaInfo.map((t) => t.tableName));

  for (const table of schemaInfo) {
    const columnNames = new Set(table.columnsInfo.map((c) => c.column_name));

    // Validate table references
    // When adding new table reference properties, add them here
    validateTableRefs(
      errors,
      table.tableName,
      'foreignTables',
      table.foreignTables,
      tableNames,
    );
    validateTableRefs(
      errors,
      table.tableName,
      'childTables',
      table.childTables,
      tableNames,
    );
    validateTableRefs(
      errors,
      table.tableName,
      'hasOne',
      table.hasOne,
      tableNames,
    );
    validateTableRefs(
      errors,
      table.tableName,
      'hasMany',
      table.hasMany,
      tableNames,
    );
    validateTableRefs(
      errors,
      table.tableName,
      'belongsTo',
      table.belongsTo,
      tableNames,
    );
    validateTableRefs(
      errors,
      table.tableName,
      'belongsToMany',
      table.belongsToMany,
      tableNames,
    );

    // Validate column references
    // When adding new column reference properties, add them here
    validateColumnRef(
      errors,
      table.tableName,
      'ownerField',
      table.ownerField,
      columnNames,
    );

    // Validate foreignKeys (columns that should exist in this table)
    if (table.foreignKeys) {
      for (const fkColumn of table.foreignKeys) {
        if (!columnNames.has(fkColumn)) {
          errors.push({
            table: table.tableName,
            property: 'foreignKeys',
            value: fkColumn,
            message: `Foreign key column '${fkColumn}' does not exist in ${table.tableName}.columnsInfo`,
          });
        }
      }
    }

    // Validate pivotRelationships
    if (table.pivotRelationships) {
      for (const pivot of table.pivotRelationships) {
        if (!tableNames.has(pivot.relatedTable)) {
          errors.push({
            table: table.tableName,
            property: 'pivotRelationships.relatedTable',
            value: pivot.relatedTable,
            message: `Table '${pivot.relatedTable}' does not exist in schema`,
          });
        }
        if (!tableNames.has(pivot.pivotTable)) {
          errors.push({
            table: table.tableName,
            property: 'pivotRelationships.pivotTable',
            value: pivot.pivotTable,
            message: `Table '${pivot.pivotTable}' does not exist in schema`,
          });
        }
      }
    }

    // Validate foreign_key references in columnsInfo
    for (const column of table.columnsInfo) {
      if (column.foreign_key) {
        const { foreign_table_name, foreign_column_name } = column.foreign_key;

        // Check foreign table exists
        if (!tableNames.has(foreign_table_name)) {
          errors.push({
            table: table.tableName,
            property: `columnsInfo.${column.column_name}.foreign_key.foreign_table_name`,
            value: foreign_table_name,
            message: `Foreign table '${foreign_table_name}' does not exist in schema`,
          });
        } else {
          // Check foreign column exists in the foreign table
          const foreignTable = schemaInfo.find(
            (t) => t.tableName === foreign_table_name,
          );
          if (foreignTable) {
            const foreignColumnExists = foreignTable.columnsInfo.some(
              (c) => c.column_name === foreign_column_name,
            );
            if (!foreignColumnExists) {
              errors.push({
                table: table.tableName,
                property: `columnsInfo.${column.column_name}.foreign_key.foreign_column_name`,
                value: foreign_column_name,
                message: `Column '${foreign_column_name}' does not exist in ${foreign_table_name}.columnsInfo`,
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validates schemaInfo and throws if invalid.
 * Use in development/testing to catch issues early.
 */
export function assertValidSchemaInfo(schemaInfo: ISchemaInfo[]): void {
  const errors = validateSchemaInfo(schemaInfo);
  if (errors.length > 0) {
    const errorMessages = errors
      .map((e) => `  [${e.table}] ${e.property}: ${e.message}`)
      .join('\n');
    throw new Error(`Schema validation failed:\n${errorMessages}`);
  }
}

/**
 * Validates schemaInfo and logs warnings if invalid.
 * Use in production where you don't want to crash but want visibility.
 */
export function warnInvalidSchemaInfo(schemaInfo: ISchemaInfo[]): boolean {
  const errors = validateSchemaInfo(schemaInfo);
  if (errors.length > 0) {
    console.warn('Schema validation warnings:');
    for (const error of errors) {
      console.warn(`  [${error.table}] ${error.property}: ${error.message}`);
    }
    return false;
  }
  return true;
}
