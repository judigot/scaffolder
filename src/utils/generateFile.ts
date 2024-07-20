import { typeMappings } from './convertType';
import { toPascalCase } from '../helpers/toPascalCase';
import { format as formatSQL } from 'sql-formatter';
import { IColumnInfo, IRelationshipInfo } from '@/interfaces/interfaces';

const quoteTableName = (tableName: string): string => `"${tableName}"`;

const getType = (
  column: IColumnInfo,
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  const targetType = fileType === 'sql-tables' ? 'postgresql' : 'typescript';
  const { column_name, data_type, primary_key } = column;

  if (primary_key) {
    return typeMappings.primaryKey[targetType];
  }

  if (column_name.toLowerCase().includes('password')) {
    return typeMappings.password[targetType];
  }

  if (column_name.endsWith('_id')) {
    return typeMappings.number[targetType];
  }

  return typeMappings[data_type][targetType];
};

const getColumnDefinition = (
  column: IColumnInfo,
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  const { column_name, is_nullable, primary_key, unique } = column;
  const type = getType(column, fileType);
  let definition = '';

  switch (fileType) {
    case 'sql-tables':
      definition = `${column_name} ${type}`;
      if (unique) {
        definition += ' UNIQUE';
      }
      if (!primary_key && is_nullable === 'NO') {
        definition += ' NOT NULL';
      }
      definition = definition.trim();
      break;

    case 'ts-interfaces':
      definition = `${column_name}: ${type}`;
      if (!primary_key && is_nullable === 'YES') {
        definition += ' | null';
      }
      definition += ';';
      break;

    default:
      throw new Error('Invalid file type specified');
  }

  return definition;
};

const getForeignKeyConstraints = (
  tableName: string,
  relationships: IRelationshipInfo[],
): string[] => {
  const tableRelationships = relationships.find(
    (rel) => rel.table === tableName,
  );
  if (!tableRelationships) return [];

  return tableRelationships.foreignKeys.map((key) => {
    const referencedTable =
      tableRelationships.foreignTables.find((table) => key.startsWith(table)) ??
      key.slice(0, -3);
    return `CONSTRAINT FK_${tableName}_${key} FOREIGN KEY (${key}) REFERENCES ${quoteTableName(referencedTable)}(${key})`;
  });
};

const generateSQLSchema = (relationships: IRelationshipInfo[]): string => {
  return relationships
    .map(({ table, columnsInfo }) => {
      const quotedTableName = quoteTableName(table);
      const columns = columnsInfo
        .map((col) => getColumnDefinition(col, 'sql-tables'))
        .join(',\n  ');
      const foreignKeyConstraints = getForeignKeyConstraints(
        table,
        relationships,
      ).join(',\n  ');
      const allColumnsAndKeys = [columns, foreignKeyConstraints]
        .filter(Boolean)
        .join(',\n  ');

      return `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;\nCREATE TABLE ${quotedTableName} (\n${allColumnsAndKeys}\n);`;
    })
    .join('\n');
};

const generateTypescriptInterfaces = (
  relationships: IRelationshipInfo[],
): string => {
  return relationships
    .map(({ table, columnsInfo }) => {
      const interfaceName = toPascalCase(table);
      const properties = columnsInfo
        .map((col) => getColumnDefinition(col, 'ts-interfaces'))
        .join('\n  ');
      return `export interface I${interfaceName} {\n  ${properties}\n}`;
    })
    .join('\n\n');
};

const generateFile = (
  relationships: IRelationshipInfo[],
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  switch (fileType) {
    case 'sql-tables':
      return formatSQL(generateSQLSchema(relationships));
    case 'ts-interfaces':
      return generateTypescriptInterfaces(relationships);
    default:
      throw new Error('Invalid file type specified');
  }
};

export default generateFile;
