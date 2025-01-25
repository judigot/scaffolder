import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';

function renameTable({
  oldTableName,
  newTableName,
  schemaInfo,
}: {
  oldTableName: string;
  newTableName: string;
  schemaInfo: ISchemaInfo[];
}): ISchemaInfo[] {
  /* Helper functions for table name replacement */
  const replaceOldTableNameInTableName = (tableName: string): string => {
    return tableName === oldTableName ? newTableName : tableName;
  };

  const replaceOldTableNameInRequiredColumns = (
    columns: string[],
    tableName: string,
    isPivot: boolean,
  ): string[] => {
    return columns.map((column) => {
      if (isPivot && column === `${tableName}_id`) {
        // For pivot tables, keep the original primary key format
        return `${tableName.replace(oldTableName, newTableName)}_id`;
      }
      return column === `${oldTableName}_id` ? `${newTableName}_id` : column;
    });
  };

  const replaceOldTableNameInColumnInfo = (
    columns: IColumnInfo[],
    tableName: string,
    isPivot: boolean,
  ): IColumnInfo[] => {
    return columns.map((column) => {
      const updatedColumn = { ...column };

      // Handle primary key column name for pivot tables
      if (isPivot && column.primary_key) {
        updatedColumn.column_name = `${tableName.replace(oldTableName, newTableName)}_id`;
      } else if (column.column_name === `${oldTableName}_id`) {
        updatedColumn.column_name = `${newTableName}_id`;
      }

      // Handle foreign key references
      if (updatedColumn.foreign_key) {
        updatedColumn.foreign_key = {
          ...updatedColumn.foreign_key,
          foreign_table_name:
            updatedColumn.foreign_key.foreign_table_name === oldTableName
              ? newTableName
              : updatedColumn.foreign_key.foreign_table_name,
          foreign_column_name:
            updatedColumn.foreign_key.foreign_column_name ===
            `${oldTableName}_id`
              ? `${newTableName}_id`
              : updatedColumn.foreign_key.foreign_column_name,
        };
      }

      return updatedColumn;
    });
  };

  const replaceOldTableNameInForeignTables = (tables: string[]): string[] => {
    return tables.map((table) =>
      table === oldTableName ? newTableName : table,
    );
  };

  const replaceOldTableNameInForeignKeys = (keys: string[]): string[] => {
    return keys.map((key) =>
      key === `${oldTableName}_id` ? `${newTableName}_id` : key,
    );
  };

  const replaceOldTableNameInChildTables = (tables: string[]): string[] => {
    return tables.map((table) =>
      table.includes(oldTableName)
        ? table.replace(oldTableName, newTableName)
        : table,
    );
  };

  const replaceOldTableNameInHasOne = (relations: string[]): string[] => {
    return relations.map((relation) =>
      relation === oldTableName ? newTableName : relation,
    );
  };

  const replaceOldTableNameInHasMany = (relations: string[]): string[] => {
    return relations.map((relation) =>
      relation.includes(oldTableName)
        ? relation.replace(oldTableName, newTableName)
        : relation,
    );
  };

  const replaceOldTableNameInBelongsTo = (relations: string[]): string[] => {
    return relations.map((relation) =>
      relation === oldTableName ? newTableName : relation,
    );
  };

  const replaceOldTableNameInBelongsToMany = (
    relations: string[],
  ): string[] => {
    return relations.map((relation) =>
      relation.includes(oldTableName)
        ? relation.replace(oldTableName, newTableName)
        : relation,
    );
  };

  const replaceOldTableNameInPivotRelationships = (
    pivots: { relatedTable: string; pivotTable: string }[],
  ): { relatedTable: string; pivotTable: string }[] => {
    return pivots.map((pivot) => ({
      ...pivot,
      relatedTable:
        pivot.relatedTable === oldTableName ? newTableName : pivot.relatedTable,
      pivotTable: pivot.pivotTable.includes(oldTableName)
        ? pivot.pivotTable.replace(oldTableName, newTableName)
        : pivot.pivotTable,
    }));
  };

  /* Main function logic */
  return schemaInfo.map((table) => {
    // Handle pivot table names
    const isRelatedPivotTable =
      table.isPivot &&
      (table.tableName.startsWith(`${oldTableName}_`) ||
        table.tableName.endsWith(`_${oldTableName}`));

    // If this is the table being renamed or a related pivot table
    const updatedTableName =
      (isRelatedPivotTable ?? false)
        ? table.tableName.replace(oldTableName, newTableName)
        : replaceOldTableNameInTableName(table.tableName);

    const returnValue = {
      ...table,
      tableName: updatedTableName,
    };

    const requiredColumns = replaceOldTableNameInRequiredColumns(
      table.requiredColumns ?? [],
      table.tableName,
      table.isPivot ?? false,
    );
    if (requiredColumns.length > 0) {
      const [first, ...rest] = requiredColumns;
      returnValue.requiredColumns = [first, ...rest];
    }

    const columnsInfo = replaceOldTableNameInColumnInfo(
      table.columnsInfo,
      table.tableName,
      table.isPivot ?? false,
    );
    if (columnsInfo.length > 0) {
      returnValue.columnsInfo = columnsInfo;
    }

    const foreignTables = replaceOldTableNameInForeignTables(
      table.foreignTables ?? [],
    );
    if (foreignTables.length > 0) {
      const [first, ...rest] = foreignTables;
      returnValue.foreignTables = [first, ...rest];
    }

    const foreignKeys = replaceOldTableNameInForeignKeys(
      table.foreignKeys ?? [],
    );
    if (foreignKeys.length > 0) {
      const [first, ...rest] = foreignKeys;
      returnValue.foreignKeys = [first, ...rest];
    }

    const childTables = replaceOldTableNameInChildTables(
      table.childTables ?? [],
    );
    if (childTables.length > 0) {
      const [first, ...rest] = childTables;
      returnValue.childTables = [first, ...rest];
    }

    const hasOne = replaceOldTableNameInHasOne(table.hasOne ?? []);
    if (hasOne.length > 0) {
      const [first, ...rest] = hasOne;
      returnValue.hasOne = [first, ...rest];
    }

    const hasMany = replaceOldTableNameInHasMany(table.hasMany ?? []);
    if (hasMany.length > 0) {
      const [first, ...rest] = hasMany;
      returnValue.hasMany = [first, ...rest];
    }

    const belongsTo = replaceOldTableNameInBelongsTo(table.belongsTo ?? []);
    if (belongsTo.length > 0) {
      const [first, ...rest] = belongsTo;
      returnValue.belongsTo = [first, ...rest];
    }

    const belongsToMany = replaceOldTableNameInBelongsToMany(
      table.belongsToMany ?? [],
    );
    if (belongsToMany.length > 0) {
      const [first, ...rest] = belongsToMany;
      returnValue.belongsToMany = [first, ...rest];
    }

    const pivotRelationships = replaceOldTableNameInPivotRelationships(
      table.pivotRelationships ?? [],
    );
    if (pivotRelationships.length > 0) {
      const [first, ...rest] = pivotRelationships;
      returnValue.pivotRelationships = [first, ...rest];
    }

    return returnValue;
  });
}

export default renameTable;
