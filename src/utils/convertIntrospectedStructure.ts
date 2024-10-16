import {
  IColumnInfo,
  ISchemaInfo,
  isITable,
  IIntrospectedSchemaInfo,
} from '@/interfaces/interfaces';
import { addSchemaInfo } from '@/utils/identifySchema';
import { typeMappings } from '@/utils/mappings';

export const getTypeScriptType = (dataType: string): string => {
  // Normalize the data type to lowercase
  const identifiedType = dataType.toLowerCase();

  // Check if the identified type directly exists in typeMappings
  if (identifiedType in typeMappings) {
    return typeMappings[identifiedType].typescript;
  }

  // Iterate through the typeMappings to find a matching introspected type
  for (const mappings of Object.values(typeMappings)) {
    if (
      mappings['postgresql-introspected'].includes(identifiedType) ||
      mappings['mysql-introspected'].includes(identifiedType)
    ) {
      return mappings.typescript;
    }
  }

  // Fallback to string if no match is found
  return typeMappings.string.typescript;
};

export const getRequiredColumns = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.is_nullable === 'NO')
    .map((column) => column.column_name);

export const getForeignTables = (columns: IColumnInfo[]): string[] =>
  Array.from(
    new Set(
      columns
        .filter((column) => column.foreign_key !== null)
        .map((column) => column.foreign_key?.foreign_table_name ?? ''),
    ),
  ).filter((tableName) => tableName !== '');

export const getForeignKeys = (columns: IColumnInfo[]): string[] => {
  return Array.from(
    new Set(
      columns.filter((col) => col.foreign_key).map((col) => col.column_name),
    ),
  );
};

export const convertColumn = ({
  column_name,
  data_type,
  is_nullable,
  column_default,
  primary_key,
  unique,
  foreign_key,
}: IColumnInfo): IColumnInfo => ({
  column_name,
  data_type: getTypeScriptType(data_type),
  is_nullable,
  column_default: primary_key ? `AUTO_INCREMENT` : column_default,
  primary_key,
  unique,
  foreign_key,
});

export const convertTable = (table: IIntrospectedSchemaInfo): ISchemaInfo => {
  let tableName: string;
  let columns: IColumnInfo[];

  if (isITable(table)) {
    tableName = table.table_name;
    columns = table.columns;
  } else {
    throw new Error('Invalid table structure or dbType');
  }

  const columnsInfo = columns.map(convertColumn);
  const requiredColumns = getRequiredColumns(columnsInfo);
  const foreignTables = getForeignTables(columnsInfo);
  const foreignKeys = getForeignKeys(columnsInfo);

  return {
    table: tableName,
    tableCases: {
      plural: '',
      titleCase: '',
      sentenceCase: '',
      phraseCase: '',
      pascalCase: '',
      camelCase: '',
      kebabCase: '',
      snakeCase: '',
      titleCasePlural: '',
      sentenceCasePlural: '',
      phraseCasePlural: '',
      pascalCasePlural: '',
      camelCasePlural: '',
      kebabCasePlural: '',
      snakeCasePlural: '',
    },
    requiredColumns,
    columnsInfo,
    foreignTables,
    foreignKeys,
    isPivot: false,
    childTables: [],
    hasOne: [],
    hasMany: [],
    belongsTo: [],
    belongsToMany: [],
    pivotRelationships: [],
  };
};

export const populateChildTables = (
  tableMap: Map<string, ISchemaInfo>,
): void => {
  tableMap.forEach((table) => {
    table.foreignTables.forEach((foreignTable) => {
      if (tableMap.has(foreignTable)) {
        tableMap.get(foreignTable)?.childTables.push(table.table);
      }
    });
  });
};

const convertIntrospectedStructure = (
  tables: IIntrospectedSchemaInfo[],
): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => {
      if (isITable(table)) {
        return [table.table_name, convertTable(table)];
      } else {
        throw new Error('Invalid table structure or dbType');
      }
    }),
  );

  let schemaInfo = [...tableMap.values()];

  schemaInfo = addSchemaInfo(schemaInfo);

  return schemaInfo;
};

export default convertIntrospectedStructure;
