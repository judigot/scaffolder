import { IColumnInfo, IRelationshipInfo } from './identifyRelationships';
import { typeMappings } from './convertType';

const quoteTableName = (tableName: string): string => `"${tableName}"`;

const getColumnDefinition = ({
  column_name,
  data_type,
  is_nullable,
  primary_key,
  unique,
}: IColumnInfo): string => {
  const type = (() => {
    if (primary_key) return typeMappings.primaryKey.postgresql;
    if (column_name.endsWith('_id')) return typeMappings.number.postgresql;
    if (column_name.toLowerCase().includes('password'))
      return typeMappings.password.postgresql;
    return data_type;
  })();

  let nullableString = '';
  if (!primary_key) {
    nullableString = is_nullable === 'YES' ? '' : 'NOT NULL';
  }

  const uniqueString = unique ? 'UNIQUE' : '';

  return `${column_name} ${type} ${uniqueString} ${nullableString}`.trim();
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
  const schemaParts: string[] = relationships.map(({ table, columnsInfo }) => {
    const quotedTableName = quoteTableName(table);
    const columns = columnsInfo.map(getColumnDefinition).join(',\n  ');
    const foreignKeyConstraints = getForeignKeyConstraints(
      table,
      relationships,
    ).join(',\n  ');
    const allColumnsAndKeys = [columns, foreignKeyConstraints]
      .filter(Boolean)
      .join(',\n  ');

    return `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;\nCREATE TABLE ${quotedTableName} (\n  ${allColumnsAndKeys}\n);`;
  });

  return schemaParts.join('\n');
};

export default generateSQLSchema;
