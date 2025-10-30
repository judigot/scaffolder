import type { ISchemaInfo } from '../interfaces/interfaces.ts';
import {
  UNIQUE_COLUMN_NAMES,
  isJunctionTable,
  addParentRelationships,
  determineUniqueForeignKeys,
} from '../utils/identifySchema.ts';
import { changeCase } from '../utils/common.ts';

// Accepted verbs for relationship definitions
const RELATIONSHIP_VERBS = ['has', 'have'];
const VERB_PATTERN = RELATIONSHIP_VERBS.join('|');

interface IRelationship {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  from: string;
  to: string;
}

function addTable(
  tables: Set<string>,
  schemaInfo: ISchemaInfo[],
  tableName: string,
): void {
  const singularName = changeCase(tableName).singular;
  if (!tables.has(singularName)) {
    tables.add(singularName);
    const primaryKeyName = `${singularName}_id`;
    schemaInfo.push({
      tableName: singularName,
      requiredColumns: [primaryKeyName],
      columnsInfo: [
        {
          column_name: primaryKeyName,
          data_type: 'number',
          is_nullable: 'NO',
          column_default: 'AUTO_INCREMENT',
          primary_key: true,
        },
      ],
    });
  }
}

function addForeignKey(
  schemaInfo: ISchemaInfo[],
  fromTable: string,
  toTable: string,
  isUnique = false,
): void {
  const singularFromTable = changeCase(fromTable).singular;
  const singularToTable = changeCase(toTable).singular;
  const table = schemaInfo.find((t) => t.tableName === singularFromTable);
  if (!table) {
    return;
  }

  const foreignKeyName = `${singularToTable}_id`;
  if (!table.columnsInfo.some((c) => c.column_name === foreignKeyName)) {
    table.requiredColumns.push(foreignKeyName);
    table.columnsInfo.push({
      column_name: foreignKeyName,
      data_type: 'number',
      is_nullable: 'NO',
      unique: isUnique || UNIQUE_COLUMN_NAMES.includes(foreignKeyName),
      foreign_key: {
        foreign_table_name: singularToTable,
        foreign_column_name: `${singularToTable}_id`,
      },
    });
    table.foreignTables.push(singularToTable);
    table.foreignKeys.push(foreignKeyName);
  }
}

function parseRelationship(
  statement: string,
  relationships: IRelationship[],
  tables: Set<string>,
  schemaInfo: ISchemaInfo[],
): void {
  const hasOneMatch = new RegExp(
    `(\\w+)\\s+(${VERB_PATTERN})\\s+one\\s+(\\w+)`,
    'i',
  ).exec(statement);
  const hasManyMatch = new RegExp(
    `(\\w+)\\s+(${VERB_PATTERN})\\s+many\\s+(\\w+)(?:\\s+via\\s+pivot)?`,
    'i',
  ).exec(statement);
  const belongsToMatch = /(\w+)\s+belongs\s+to\s+(\w+)/i.exec(statement);
  const belongsToManyMatch = /(\w+)\s+belongs\s+to\s+many\s+(\w+)/i.exec(
    statement,
  );

  let relationship: IRelationship | null = null;

  if (hasOneMatch) {
    relationship = {
      type: 'hasOne',
      from: changeCase(hasOneMatch[1]).singular,
      to: changeCase(hasOneMatch[3]).singular,
    };
  } else if (hasManyMatch) {
    const hasViaPivot = statement.includes('via pivot');
    relationship = {
      type: hasViaPivot ? 'belongsToMany' : 'hasMany',
      from: changeCase(hasManyMatch[1]).singular,
      to: changeCase(hasManyMatch[3]).singular,
    };
  } else if (belongsToMatch) {
    relationship = {
      type: 'belongsTo',
      from: changeCase(belongsToMatch[1]).singular,
      to: changeCase(belongsToMatch[2]).singular,
    };
  } else if (belongsToManyMatch) {
    relationship = {
      type: 'belongsToMany',
      from: changeCase(belongsToManyMatch[1]).singular,
      to: changeCase(belongsToManyMatch[2]).singular,
    };
  }

  if (relationship) {
    relationships.push(relationship);
    addTable(tables, schemaInfo, relationship.from);
    addTable(tables, schemaInfo, relationship.to);
  }
}

function processRelationships(
  relationships: IRelationship[],
  schemaInfo: ISchemaInfo[],
): void {
  relationships.forEach((rel) => {
    const fromTable = schemaInfo.find((t) => t.tableName === rel.from);
    const toTable = schemaInfo.find((t) => t.tableName === rel.to);
    if (!fromTable || !toTable) {
      return;
    }

    switch (rel.type) {
      case 'hasOne':
        fromTable.hasOne.push(rel.to);
        fromTable.childTables.push(rel.to);
        addForeignKey(schemaInfo, rel.to, rel.from, true); // Set unique to true for one-to-one
        break;
      case 'hasMany':
        fromTable.hasMany.push(rel.to);
        fromTable.childTables.push(rel.to);
        addForeignKey(schemaInfo, rel.to, rel.from, false);
        break;
      case 'belongsTo':
        fromTable.belongsTo.push(rel.to);
        addForeignKey(schemaInfo, rel.from, rel.to, false);
        break;
      case 'belongsToMany': {
        fromTable.belongsToMany.push(rel.to);
        toTable.belongsToMany.push(rel.from);
        // Create pivot table
        const pivotTableName = `${rel.from}_${rel.to}`;
        addTable(new Set(), schemaInfo, pivotTableName);
        const pivotTable = schemaInfo.find(
          (t) => t.tableName === pivotTableName,
        );
        if (pivotTable) {
          pivotTable.isPivot = true;
          pivotTable.belongsTo.push(rel.from, rel.to);
          addForeignKey(schemaInfo, pivotTableName, rel.from);
          addForeignKey(schemaInfo, pivotTableName, rel.to);
          fromTable.pivotRelationships.push({
            relatedTable: rel.to,
            pivotTable: pivotTableName,
          });
          toTable.pivotRelationships.push({
            relatedTable: rel.from,
            pivotTable: pivotTableName,
          });
          // Add hasMany relationship to pivot table
          fromTable.hasMany.push(pivotTableName);
          toTable.hasMany.push(pivotTableName);
          fromTable.childTables.push(pivotTableName);
          toTable.childTables.push(pivotTableName);
        }
        break;
      }
    }
  });
}

function parseNQL(nql: string): ISchemaInfo[] {
  const statements = nql
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);

  const relationships: IRelationship[] = [];
  const tables = new Set<string>();
  const schemaInfo: ISchemaInfo[] = [];

  statements.forEach((statement) => {
    parseRelationship(statement, relationships, tables, schemaInfo);
  });

  processRelationships(relationships, schemaInfo);

  // Apply additional schema processing
  schemaInfo.forEach((table) => {
    table.isPivot = isJunctionTable(table, schemaInfo);
  });
  addParentRelationships(schemaInfo);
  determineUniqueForeignKeys(schemaInfo);

  return schemaInfo;
}

export default parseNQL;
