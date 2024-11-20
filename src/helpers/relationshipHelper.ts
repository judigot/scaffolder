import { ITableInfo } from '@/interfaces/interfaces';

export const addRelationship = (
  schemaInfo: ITableInfo[],
  tableIndex: number,
  relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  newTableName: string,
): ITableInfo[] => {
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
      (table) => table.table === newTableName,
    );

    if (!targetTable) {
      // Create a new target table if it doesn't exist
      targetTable = {
        table: newTableName,
        foreignTables: [sourceTable.table], // Add sourceTable to foreignTables
        childTables: [],
        isPivot: false,
        hasOne: [],
        hasMany: [],
        belongsTo: [sourceTable.table], // Add sourceTable to belongsTo
        belongsToMany: [],
        pivotRelationships: [],
      };
      updatedSchema.push(targetTable);
    } else {
      // Update the existing target table
      if (!targetTable.foreignTables.includes(sourceTable.table)) {
        targetTable.foreignTables.push(sourceTable.table);
      }
      if (!targetTable.belongsTo.includes(sourceTable.table)) {
        targetTable.belongsTo.push(sourceTable.table);
      }
    }
  }

  if (relationshipType === 'belongsToMany') {
    // Many-to-many relationships require a pivot table
    const pivotTableName = `${sourceTable.table}_${newTableName}`;

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
      (table) => table.table === pivotTableName,
    );

    if (!pivotTable) {
      // Create a new pivot table
      pivotTable = {
        table: pivotTableName,
        foreignTables: [sourceTable.table, newTableName],
        childTables: [],
        isPivot: true,
        hasOne: [],
        hasMany: [],
        belongsTo: [sourceTable.table, newTableName],
        belongsToMany: [],
        pivotRelationships: [],
      };
      updatedSchema.push(pivotTable);
    }

    // Add to target table's belongsToMany
    const targetTable = updatedSchema.find(
      (table) => table.table === newTableName,
    );

    if (!targetTable) {
      // Create a new target table if it doesn't exist
      updatedSchema.push({
        table: newTableName,
        foreignTables: [],
        childTables: [pivotTableName],
        isPivot: false,
        hasOne: [],
        hasMany: [],
        belongsTo: [],
        belongsToMany: [sourceTable.table],
        pivotRelationships: [],
      });
    } else {
      // Update the existing target table
      if (!targetTable.belongsToMany.includes(sourceTable.table)) {
        targetTable.belongsToMany.push(sourceTable.table);
      }

      if (!targetTable.childTables.includes(pivotTableName)) {
        targetTable.childTables.push(pivotTableName);
      }
    }
  }

  return updatedSchema;
};
