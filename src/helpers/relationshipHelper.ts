import { ISchemaInfo } from '@/interfaces/interfaces.ts';

export const addRelationship = (
  schemaInfo: ISchemaInfo[],
  tableIndex: number,
  relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  newTableName: string,
): ISchemaInfo[] => {
  const updatedSchema = [...schemaInfo];
  const sourceTable = updatedSchema[tableIndex];

  if (relationshipType === 'hasOne' || relationshipType === 'hasMany') {
    // Add to source table's hasOne or hasMany
    if (!sourceTable[relationshipType].includes(newTableName)) {
      sourceTable[relationshipType].push(newTableName);
    }

    // Add to source table's childTables
    if (!sourceTable.childTables.includes(newTableName)) {
      sourceTable.childTables.push(newTableName);
    }

    // Check if the target table exists
    let targetTable = updatedSchema.find(
      (table) => table.tableName === newTableName,
    );

    if (!targetTable) {
      // Create a new target table if it doesn't exist
      targetTable = {
        tableName: newTableName,
        columnsInfo: [
          {
            column_name: `${newTableName}_id`,
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
            unique: false,
            foreign_key: null,
          },
        ],
        foreignTables: [sourceTable.tableName],
        childTables: [],
        isPivot: false,
        hasOne: [],
        hasMany: [],
        belongsTo: [sourceTable.tableName],
        belongsToMany: [],
        pivotRelationships: [],
        foreignKeys: [],
        requiredColumns: [],
      };
      updatedSchema.push(targetTable);
    } else {
      // Update the existing target table
      if (!targetTable.foreignTables.includes(sourceTable.tableName)) {
        targetTable.foreignTables.push(sourceTable.tableName);
      }
      if (!targetTable.belongsTo.includes(sourceTable.tableName)) {
        targetTable.belongsTo.push(sourceTable.tableName);
      }
    }
  }

  if (relationshipType === 'belongsToMany') {
    // Many-to-many relationships require a pivot table
    const pivotTableName = `${sourceTable.tableName}_${newTableName}`;

    // Add to source table's belongsToMany
    if (!sourceTable.belongsToMany.includes(newTableName)) {
      sourceTable.belongsToMany.push(newTableName);
    }

    // Add the pivot relationship to sourceTable
    if (
      !sourceTable.pivotRelationships.some(
        (relation) => relation.relatedTable === newTableName,
      )
    ) {
      sourceTable.pivotRelationships.push({
        relatedTable: newTableName,
        pivotTable: pivotTableName,
      });
    }

    // Check if the pivot table exists
    let pivotTable = updatedSchema.find(
      (table) => table.tableName === pivotTableName,
    );

    if (!pivotTable) {
      // Create a new pivot table
      pivotTable = {
        tableName: pivotTableName,
        columnsInfo: [
          {
            column_name: '',
            data_type: '',
            is_nullable: '',
            column_default: null,
            primary_key: false,
            unique: false,
            foreign_key: null,
          },
        ],
        foreignKeys: [],
        requiredColumns: [],
        foreignTables: [sourceTable.tableName, newTableName],
        childTables: [],
        isPivot: true,
        hasOne: [],
        hasMany: [],
        belongsTo: [sourceTable.tableName, newTableName],
        belongsToMany: [],
        pivotRelationships: [],
      };
      updatedSchema.push(pivotTable);
    }

    // Add to target table's belongsToMany
    const targetTable = updatedSchema.find(
      (table) => table.tableName === newTableName,
    );

    if (!targetTable) {
      // Create a new target table if it doesn't exist
      updatedSchema.push({
        tableName: newTableName,
        columnsInfo: [
          {
            column_name: '',
            data_type: '',
            is_nullable: '',
            column_default: null,
            primary_key: false,
            unique: false,
            foreign_key: null,
          },
        ],
        foreignKeys: [],
        requiredColumns: [],
        foreignTables: [],
        childTables: [pivotTableName],
        isPivot: false,
        hasOne: [],
        hasMany: [],
        belongsTo: [],
        belongsToMany: [sourceTable.tableName],
        pivotRelationships: [],
      });
    } else {
      // Update the existing target table
      if (!targetTable.belongsToMany.includes(sourceTable.tableName)) {
        targetTable.belongsToMany.push(sourceTable.tableName);
      }

      if (!targetTable.childTables.includes(pivotTableName)) {
        targetTable.childTables.push(pivotTableName);
      }
    }
  }

  return updatedSchema;
};

export const purgeForeignKeyTraces = (schemaInfo: ISchemaInfo[]): ISchemaInfo[] => {
  const existingTableNames = new Set(schemaInfo.map(table => table.tableName));

  return schemaInfo.map(table => {
    // Clean up columnsInfo by removing columns with invalid foreign keys
    const updatedColumnsInfo = table.columnsInfo.filter(column => {
      // Keep columns that either have no foreign key or have a valid foreign key
      return column.foreign_key === null || existingTableNames.has(column.foreign_key.foreign_table_name);
    });

    // Get the list of removed column names
    const removedColumnNames = new Set(
      table.columnsInfo
        .filter(column => 
          column.foreign_key !== null && !existingTableNames.has(column.foreign_key.foreign_table_name)
        )
        .map(column => column.column_name)
    );

    // Clean up relationship arrays and required columns
    const updatedTable = {
      ...table,
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
    };

    return updatedTable;
  });
};
