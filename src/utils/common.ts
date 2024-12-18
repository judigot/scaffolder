import { replacePlaceholder } from '@/helpers/stringHelper';
import { DBTypes, IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';
import { typeMappings } from '@/utils/mappings';
import pluralize from 'pluralize';

export function changeCase(input: string) {
  const words = input.replace(/[_-]/g, ' ').trim().split(/\s+/);
  const allWordsExceptLast = words.slice(0, -1);
  const lastWord = words[words.length - 1];
  const tableNamePlural = [...allWordsExceptLast, pluralize(lastWord)];
  const tableNameSingular = [
    ...allWordsExceptLast,
    pluralize.singular(lastWord),
  ];

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const joinWords = (arr: string[], separator: string) =>
    arr.join(separator).toLowerCase();
  const titleCase = (arr: string[]) => arr.map(capitalize).join(' ');

  /* prettier-ignore */
  return {
    plural: pluralize(input),
    singular: pluralize.singular(input),
    titleCase: titleCase(words),
    sentenceCase: capitalize(joinWords(words, ' ')),
    phraseCase: joinWords(words, ' '),
    pascalCase: words.map(capitalize).join(''),
    camelCase: words[0].toLowerCase() + words.slice(1).map(capitalize).join(''),
    kebabCase: joinWords(words, '-'),
    snakeCase: joinWords(words, '_'),
    titleCasePlural: titleCase(tableNamePlural),
    sentenceCasePlural: capitalize(joinWords(tableNamePlural, ' ')),
    phraseCasePlural: joinWords(tableNamePlural, ' '),
    pascalCasePlural: tableNamePlural.map(capitalize).join(''),
    camelCasePlural: tableNamePlural[0].toLowerCase() + tableNamePlural.slice(1).map(capitalize).join(''),
    kebabCasePlural: joinWords(tableNamePlural, '-'),
    snakeCasePlural: joinWords(tableNamePlural, '_'),
    titleCaseSingular: titleCase(tableNameSingular),
    sentenceCaseSingular: capitalize(joinWords(tableNameSingular, ' ')),
    phraseCaseSingular: joinWords(tableNameSingular, ' '),
    pascalCaseSingular: tableNameSingular.map(capitalize).join(''),
    camelCaseSingular: tableNameSingular[0].toLowerCase() + tableNameSingular.slice(1).map(capitalize).join(''),
    kebabCaseSingular: joinWords(tableNameSingular, '-'),
    snakeCaseSingular: joinWords(tableNameSingular, '_'),
  };
}

export const getColumnDefaultDisplay = ({
  isPrimaryKey,
  isNullable,
  columnDefault,
}: {
  isPrimaryKey: boolean;
  isNullable: string;
  columnDefault: string | null;
}): string => {
  if (columnDefault !== null) {
    if (isPrimaryKey) {
      return columnDefault;
    }

    return `'${columnDefault}'`;
  }
  return isNullable === 'YES' ? String(columnDefault).toUpperCase() : '';
};

export function getPrimaryKey({
  tableName,
  schemaInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
}): string {
  const tableSchema = schemaInfo.find((schema) => schema.table === tableName);

  if (!tableSchema) {
    throw new Error(`Table "${tableName}" not found in schema information.`);
  }

  const primaryKeyColumn = tableSchema.columnsInfo.find(
    (column) => column.primary_key,
  );

  if (!primaryKeyColumn) {
    throw new Error(`Primary key not found in table "${tableName}".`);
  }

  return primaryKeyColumn.column_name;
}

export function consolidateInterfaces(
  interfaces: Record<string, string>,
): string {
  return Object.entries(interfaces)
    .map(([fileName, content]) => `\n/* ${fileName}.ts */\n${content}`)
    .join('\n')
    .trimStart();
}

export const formatDateForMySQL = (date: string): string => {
  // Extract the date and microseconds
  const [datePart, timePart] = date.split('T');
  const [time, microseconds] = timePart.split('.');
  const formattedMicroseconds = microseconds.slice(0, 6) || '000000'; // Ensure 6 digits

  return `${datePart} ${time}.${formattedMicroseconds.replace('Z', '')}`;
};

export const generateModelImports = (schemaInfo: ISchemaInfo): string => {
  const imports = new Set<string>();
  const { hasOne, hasMany, columnsInfo, pivotRelationships } = schemaInfo;

  // Collect unique import statements for related models
  [
    ...hasOne,
    ...hasMany,
    ...pivotRelationships.map((item) => item.relatedTable),
  ].forEach((relatedTable) => {
    const relatedClass = changeCase(relatedTable).pascalCase;
    imports.add(`use App\\Models\\${relatedClass};`);
  });

  columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const relatedClass = changeCase(
        column.foreign_key.foreign_table_name,
      ).pascalCase;
      imports.add(`use App\\Models\\${relatedClass};`);
    }
  });

  return Array.from(imports).join('\n');
};

export function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

export const quoteTableName = (tableName: string): string => {
  const quote = useFormStore.getState().quote;
  return `${quote}${tableName}${quote}`;
};

export const getTypeMapping = (
  column: IColumnInfo,
  columnType: DBTypes | 'typescript',
): string => {
  const { column_name, data_type, primary_key } = column;

  if (primary_key) {
    return typeMappings.primaryKey[columnType];
  }

  if (column_name.toLowerCase().includes('password')) {
    return typeMappings.password[columnType];
  }

  if (column_name.endsWith('_id')) {
    return typeMappings.number[columnType];
  }

  return typeMappings[data_type][columnType];
};

export const generateColumnDefinition = ({
  columnName,
  columnType,
}: {
  columnName: IColumnInfo;
  columnType: DBTypes | 'typescript';
}): string => {
  const columnMappings = {
    'sql-table': {
      columnTemplate: '{{columnName}} {{mappedType}}',
      unique: 'UNIQUE',
      nullable: '',
      notNullable: 'NOT NULL',
    },
    typescript: {
      columnTemplate: '{{columnName}}: {{mappedType}}',
      unique: '',
      nullable: ' | null',
      notNullable: '',
    },
  } as const;

  const quote = useFormStore.getState().quote;
  const { column_name, is_nullable, primary_key, unique } = columnName;
  const isDBDefinition = ['postgresql', 'mysql'].includes(columnType);
  const targetDefinition =
    columnMappings[isDBDefinition ? 'sql-table' : 'typescript'];
  const type = getTypeMapping(columnName, columnType);

  // Special columns
  // if (column_name === 'deleted_at') {
  //   const dbConnection = useFormStore.getState().formData.dbConnection;
  //   const targetType =
  //     columnType === 'sql-tables'
  //       ? determineSQLDatabaseType(dbConnection)
  //       : 'typescript';
  //   return replacePlaceholder(language.columnTemplate, {
  //     columnName:
  //       columnType === 'typescript'
  //         ? column_name
  //         : `${quote}${column_name}${quote}`,
  //     mappedType: typeMappings.deleted_at[targetType],
  //   });
  // }

  let definition = replacePlaceholder({
    template: targetDefinition.columnTemplate,
    replacements: {
      columnName: !isDBDefinition
        ? column_name
        : `${quote}${column_name}${quote}`,
      mappedType: type,
    },
  });

  if (isDBDefinition) {
    const isUnique = unique;
    const isNotNullable = !primary_key && is_nullable === 'NO';

    if (isUnique) {
      definition += ` ${targetDefinition.unique}`;
    }

    if (isNotNullable) {
      definition += ` ${targetDefinition.notNullable}`;
    }
  }

  if (!isDBDefinition) {
    const isNullable = !primary_key && is_nullable === 'YES';
    if (isNullable) {
      definition += targetDefinition.nullable;
    }
    definition += ';';
  }

  return definition.trim();
};

export const getForeignKeyConstraints = (
  tableName: string,
  schemaInfo: ISchemaInfo[],
): string[] => {
  const quote = useFormStore.getState().quote;
  const tableInfo = schemaInfo.find((rel) => rel.table === tableName) ?? null;

  if (tableInfo?.foreignKeys) {
    return tableInfo.foreignKeys.map((key) => {
      const referencedTable =
        tableInfo.foreignTables.find((table) => key.startsWith(table)) ??
        key.slice(0, -3);
      const primaryKeyColumn = getPrimaryKey({
        tableName: referencedTable,
        schemaInfo,
      });
      return `CONSTRAINT ${quote}FK_${tableName}_${key}${quote} FOREIGN KEY (${quote}${key}${quote}) REFERENCES ${quoteTableName(referencedTable)}(${quote}${primaryKeyColumn}${quote})`;
    });
  } else {
    return [];
  }
};
