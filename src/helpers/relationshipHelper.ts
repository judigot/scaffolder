import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';

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
    // Add foreign key to target table
    const foreignKey = createForeignKeyColumn(
      source.tableName,
      relationshipType === 'hasOne',
    );
    target.columnsInfo.splice(1, 0, foreignKey); // Insert after primary key
    target.requiredColumns?.push(foreignKey.column_name);
    target.foreignKeys?.push(foreignKey.column_name);

    // Add to source table's relationships
    if (
      source[relationshipType] &&
      !source[relationshipType].includes(target.tableName)
    ) {
      source[relationshipType].push(target.tableName);
    }
    if (source.childTables && !source.childTables.includes(target.tableName)) {
      source.childTables.push(target.tableName);
    }

    // Add to target table's relationships
    if (
      target.foreignTables &&
      !target.foreignTables.includes(source.tableName)
    ) {
      target.foreignTables.push(source.tableName);
    }
    if (target.belongsTo && !target.belongsTo.includes(source.tableName)) {
      target.belongsTo.push(source.tableName);
    }
  }

  function setupManyToManyRelationship(
    source: ISchemaInfo,
    target: ISchemaInfo,
    pivotTableName: string,
  ): void {
    // Setup source table relationships
    if (
      source.belongsToMany &&
      !source.belongsToMany.includes(target.tableName)
    ) {
      source.belongsToMany.push(target.tableName);
    }
    if (source.hasMany && !source.hasMany.includes(pivotTableName)) {
      source.hasMany.push(pivotTableName);
    }
    if (source.childTables && !source.childTables.includes(pivotTableName)) {
      source.childTables.push(pivotTableName);
    }
    if (
      source.pivotRelationships &&
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
    if (
      target.belongsToMany &&
      !target.belongsToMany.includes(source.tableName)
    ) {
      target.belongsToMany.push(source.tableName);
    }
    if (target.hasMany && !target.hasMany.includes(pivotTableName)) {
      target.hasMany.push(pivotTableName);
    }
    if (target.childTables && !target.childTables.includes(pivotTableName)) {
      target.childTables.push(pivotTableName);
    }
    if (
      target.pivotRelationships &&
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
      // Keep columns that either have no foreign key or have a valid foreign key
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
    const pivotRelationships = table.pivotRelationships?.filter(
      (rel) =>
        existingTableNames.has(rel.relatedTable) &&
        existingTableNames.has(rel.pivotTable),
    );
    if (pivotRelationships && pivotRelationships.length > 0) {
      const [first, ...rest] = pivotRelationships;
      updatedTable.pivotRelationships = [first, ...rest];
    }

    const foreignTables = table.foreignTables?.filter((t) =>
      existingTableNames.has(t),
    );
    if (foreignTables && foreignTables.length > 0) {
      const [first, ...rest] = foreignTables;
      updatedTable.foreignTables = [first, ...rest];
    }

    const foreignKeys = table.foreignKeys?.filter((t) =>
      existingTableNames.has(t),
    );
    if (foreignKeys && foreignKeys.length > 0) {
      const [first, ...rest] = foreignKeys;
      updatedTable.foreignKeys = [first, ...rest];
    }

    const childTables = table.childTables?.filter((t) =>
      existingTableNames.has(t),
    );
    if (childTables && childTables.length > 0) {
      const [first, ...rest] = childTables;
      updatedTable.childTables = [first, ...rest];
    }

    const hasOne = table.hasOne?.filter((t) => existingTableNames.has(t));
    if (hasOne && hasOne.length > 0) {
      const [first, ...rest] = hasOne;
      updatedTable.hasOne = [first, ...rest];
    }

    const hasMany = table.hasMany?.filter((t) => existingTableNames.has(t));
    if (hasMany && hasMany.length > 0) {
      const [first, ...rest] = hasMany;
      updatedTable.hasMany = [first, ...rest];
    }

    const belongsTo = table.belongsTo?.filter((t) => existingTableNames.has(t));
    if (belongsTo && belongsTo.length > 0) {
      const [first, ...rest] = belongsTo;
      updatedTable.belongsTo = [first, ...rest];
    }

    const belongsToMany = table.belongsToMany?.filter((t) =>
      existingTableNames.has(t),
    );
    if (belongsToMany && belongsToMany.length > 0) {
      const [first, ...rest] = belongsToMany;
      updatedTable.belongsToMany = [first, ...rest];
    }

    const requiredColumns = table.requiredColumns?.filter(
      (col) => !removedColumnNames.has(col),
    );
    if (requiredColumns && requiredColumns.length > 0) {
      const [first, ...rest] = requiredColumns;
      updatedTable.requiredColumns = [first, ...rest];
    }

    /*

     columnsInfo: updatedColumnsInfo,
      requiredColumns: table.requiredColumns.filter(col => !removedColumnNames.has(col)),
      foreignTables: table.foreignTables.filter(t => existingTableNames.has(t)),
      childTables: table.childTables.filter(t => existingTableNames.has(t)),
      hasOne: table.hasOne.filter(t => existingTableNames.has(t)),
      hasMany: table.hasMany.filter(t => existingTableNames.has(t)),
      belongsTo: table.belongsTo.filter(t => existingTableNames.has(t)),
      belongsToMany: table.belongsToMany.filter(t => existingTableNames.has(t)),
      pivotRelationships: table.pivotRelationships.filter(rel => 
        existingTableNames.has(rel.relatedTable) && existingTableNames.has(rel.pivotTable)
      ),
      foreignKeys: updatedColumnsInfo
        .filter(col => col.foreign_key !== null)
        .map(col => col.column_name)
    */

    return updatedTable;
  });
};
