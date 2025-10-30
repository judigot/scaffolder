import type { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';

export const addRelationship = (
  schemaInfo: ISchemaInfo[],
  sourceTableName: string,
  relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  targetTableName: string,
): ISchemaInfo[] => {
  const updatedSchema = [...schemaInfo];
  const sourceTable = updatedSchema.find(
    (table) => table.tableName === sourceTableName,
  );

  if (!sourceTable) {
    throw new Error(`Source table "${sourceTableName}" not found in schema`);
  }

  /* Helper functions to make the code more readable */
  function createBasicTable(tableName: string): ISchemaInfo {
    const primaryKey = createPrimaryKeyColumn(tableName);
    return {
      tableName,
      columnsInfo: [primaryKey],
      requiredColumns: [`${tableName}_id`],
    };
  }

  function createPrimaryKeyColumn(tableName: string): IColumnInfo {
    return {
      column_name: `${tableName}_id`,
      data_type: 'number',
      is_nullable: 'NO',
      column_default: 'AUTO_INCREMENT',
      primary_key: true,
    };
  }

  function createForeignKeyColumn(
    referencedTable: string,
    isOneToOne = false,
  ): IColumnInfo {
    const returnValue: IColumnInfo = {
      column_name: `${referencedTable}_id`,
      data_type: 'number',
      is_nullable: 'NO',
      foreign_key: {
        foreign_table_name: referencedTable,
        foreign_column_name: `${referencedTable}_id`,
      },
    };

    if (isOneToOne) {
      returnValue.unique = true;
    }

    return returnValue;
  }

  function createPivotTable(
    sourceTableName: string,
    targetTableName: string,
  ): ISchemaInfo {
    const pivotTableName = `${sourceTableName}_${targetTableName}`;
    return {
      tableName: pivotTableName,
      columnsInfo: [
        createPrimaryKeyColumn(pivotTableName),
        createForeignKeyColumn(sourceTableName),
        createForeignKeyColumn(targetTableName),
      ],
      requiredColumns: [
        `${pivotTableName}_id`,
        `${sourceTableName}_id`,
        `${targetTableName}_id`,
      ],
      foreignTables: [sourceTableName, targetTableName],
      foreignKeys: [`${sourceTableName}_id`, `${targetTableName}_id`],
      isPivot: true,
      belongsTo: [sourceTableName, targetTableName],
    };
  }

  function setupOneToOneOrManyRelationship(
    source: ISchemaInfo,
    target: ISchemaInfo,
  ): void {
    // Initialize arrays if they don't exist
    source[relationshipType] = source[relationshipType] ?? [];
    source.childTables = source.childTables ?? [];
    target.foreignTables = target.foreignTables ?? [];
    target.foreignKeys = target.foreignKeys ?? [];
    target.belongsTo = target.belongsTo ?? [];

    // Add foreign key to target table
    const foreignKey = createForeignKeyColumn(
      source.tableName,
      relationshipType === 'hasOne',
    );
    target.columnsInfo.splice(1, 0, foreignKey); // Insert after primary key
    target.requiredColumns = target.requiredColumns ?? [];
    target.requiredColumns.push(foreignKey.column_name);
    target.foreignKeys = target.foreignKeys ?? [];
    target.foreignKeys.push(foreignKey.column_name);

    // Add to source table's relationships
    if (!source[relationshipType].includes(target.tableName)) {
      source[relationshipType].push(target.tableName);
    }
    if (!source.childTables.includes(target.tableName)) {
      source.childTables.push(target.tableName);
    }

    // Add to target table's relationships
    if (!target.foreignTables.includes(source.tableName)) {
      target.foreignTables.push(source.tableName);
    }
    if (!target.belongsTo.includes(source.tableName)) {
      target.belongsTo.push(source.tableName);
    }
  }

  function setupManyToManyRelationship(
    source: ISchemaInfo,
    target: ISchemaInfo,
    pivotTableName: string,
  ): void {
    // Initialize arrays if they don't exist
    source.belongsToMany = source.belongsToMany ?? [];
    source.hasMany = source.hasMany ?? [];
    source.childTables = source.childTables ?? [];
    source.pivotRelationships = source.pivotRelationships ?? [];
    target.belongsToMany = target.belongsToMany ?? [];
    target.hasMany = target.hasMany ?? [];
    target.childTables = target.childTables ?? [];
    target.pivotRelationships = target.pivotRelationships ?? [];

    // Setup source table relationships
    if (!source.belongsToMany.includes(target.tableName)) {
      source.belongsToMany.push(target.tableName);
    }
    if (!source.hasMany.includes(pivotTableName)) {
      source.hasMany.push(pivotTableName);
    }
    if (!source.childTables.includes(pivotTableName)) {
      source.childTables.push(pivotTableName);
    }
    if (
      !source.pivotRelationships.some(
        (rel) => rel.relatedTable === target.tableName,
      )
    ) {
      source.pivotRelationships.push({
        relatedTable: target.tableName,
        pivotTable: pivotTableName,
      });
    }

    // Setup target table relationships
    if (!target.belongsToMany.includes(source.tableName)) {
      target.belongsToMany.push(source.tableName);
    }
    if (!target.hasMany.includes(pivotTableName)) {
      target.hasMany.push(pivotTableName);
    }
    if (!target.childTables.includes(pivotTableName)) {
      target.childTables.push(pivotTableName);
    }
    if (
      !target.pivotRelationships.some(
        (rel) => rel.relatedTable === source.tableName,
      )
    ) {
      target.pivotRelationships.push({
        relatedTable: source.tableName,
        pivotTable: pivotTableName,
      });
    }
  }

  /* Main logic starts here */
  if (relationshipType === 'hasOne' || relationshipType === 'hasMany') {
    // Find or create the target table
    let targetTable = updatedSchema.find(
      (table) => table.tableName === targetTableName,
    );
    if (!targetTable) {
      targetTable = createBasicTable(targetTableName);
      updatedSchema.push(targetTable);
    }

    // Setup one-to-one or one-to-many relationship
    setupOneToOneOrManyRelationship(sourceTable, targetTable);
  }

  if (relationshipType === 'belongsToMany') {
    const pivotTableName = `${sourceTable.tableName}_${targetTableName}`;

    // Find or create the target table
    let targetTable = updatedSchema.find(
      (table) => table.tableName === targetTableName,
    );
    if (!targetTable) {
      targetTable = createBasicTable(targetTableName);
      updatedSchema.push(targetTable);
    }

    // Create pivot table if it doesn't exist
    if (!updatedSchema.find((table) => table.tableName === pivotTableName)) {
      const pivotTable = createPivotTable(
        sourceTable.tableName,
        targetTableName,
      );
      updatedSchema.push(pivotTable);
    }

    // Setup many-to-many relationships
    setupManyToManyRelationship(sourceTable, targetTable, pivotTableName);
  }

  return updatedSchema;
};

export const purgeForeignKeyTraces = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  const existingTableNames = new Set(
    schemaInfo.map((table) => table.tableName),
  );

  return schemaInfo.map((table) => {
    // Clean up columnsInfo by removing columns with invalid foreign keys
    const updatedColumnsInfo = table.columnsInfo.filter((column) => {
      return (
        !column.foreign_key ||
        existingTableNames.has(column.foreign_key.foreign_table_name)
      );
    });

    // Get the list of removed column names
    const removedColumnNames = new Set(
      table.columnsInfo
        .filter(
          (column) =>
            column.foreign_key !== undefined &&
            !existingTableNames.has(column.foreign_key.foreign_table_name),
        )
        .map((column) => column.column_name),
    );

    // Clean up relationship arrays and required columns
    const updatedTable = {
      ...table,
      columnsInfo: updatedColumnsInfo,
    };

    // Helper function to filter arrays
    const filterArray = (
      array: string[] | undefined,
      filterFn: (item: string) => boolean,
    ): string[] | undefined => {
      if (array?.length == null) {
        return undefined;
      }
      const filtered = array.filter(filterFn);
      return filtered.length > 0 ? filtered : undefined;
    };

    // Clean up all relationship arrays
    updatedTable.foreignTables = filterArray(table.foreignTables, (t) =>
      existingTableNames.has(t),
    );
    updatedTable.foreignKeys = filterArray(
      table.foreignKeys,
      (k) => !removedColumnNames.has(k),
    );
    updatedTable.childTables = filterArray(table.childTables, (t) =>
      existingTableNames.has(t),
    );
    updatedTable.hasOne = filterArray(table.hasOne, (t) =>
      existingTableNames.has(t),
    );
    updatedTable.hasMany = filterArray(table.hasMany, (t) =>
      existingTableNames.has(t),
    );
    updatedTable.belongsTo = filterArray(table.belongsTo, (t) =>
      existingTableNames.has(t),
    );
    updatedTable.belongsToMany = filterArray(table.belongsToMany, (t) =>
      existingTableNames.has(t),
    );

    const requiredColumns = filterArray(
      table.requiredColumns,
      (col) => !removedColumnNames.has(col),
    );

    if (requiredColumns && requiredColumns.length > 0) {
      updatedTable.requiredColumns = requiredColumns;
    }

    // Clean up pivot relationships
    if (table.pivotRelationships?.length != null) {
      const filteredPivotRelationships = table.pivotRelationships.filter(
        (rel) =>
          existingTableNames.has(rel.relatedTable) &&
          existingTableNames.has(rel.pivotTable),
      );
      updatedTable.pivotRelationships =
        filteredPivotRelationships.length > 0
          ? filteredPivotRelationships
          : undefined;
    }

    return updatedTable;
  });
};
