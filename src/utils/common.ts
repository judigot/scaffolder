import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import {
  DBTypes,
  IColumnInfo,
  ISchemaInfo,
  IJSONSchema,
} from '@/interfaces/interfaces.ts';
import { TableCaseFormatsObject } from '@/interfaces/placeholders.ts';
import { useFormStore } from '@/useFormStore.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { typeMappings } from '@/utils/mappings.ts';
import pluralize from 'pluralize';

export function changeCase(input: string): TableCaseFormatsObject {
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
    /* users, posts, order_products */ plural: pluralize(input),
    /* user, post, order_product */ singular: pluralize.singular(input),
    /* User, Post, Order Product */ titleCase: titleCase(words),
    /* User, Post, Order product */ sentenceCase: capitalize(joinWords(words, ' ')),
    /* user, post, order product */ phraseCase: joinWords(words, ' '),
    /* User, Post, OrderProduct */ pascalCase: words.map(capitalize).join(''),
    /* user, post, orderProduct */ camelCase: words[0].toLowerCase() + words.slice(1).map(capitalize).join(''),
    /* user, post, order-product */ kebabCase: joinWords(words, '-'),
    /* user, post, order_product */ snakeCase: joinWords(words, '_'),
    /* Users, Posts, Order Products */ titleCasePlural: titleCase(tableNamePlural),
    /* Users, Posts, Order products */ sentenceCasePlural: capitalize(joinWords(tableNamePlural, ' ')),
    /* users, posts, order products */ phraseCasePlural: joinWords(tableNamePlural, ' '),
    /* Users, Posts, OrderProducts */ pascalCasePlural: tableNamePlural.map(capitalize).join(''),
    /* user, post, orderProducts */ camelCasePlural: tableNamePlural[0].toLowerCase() + tableNamePlural.slice(1).map(capitalize).join(''),
    /* user, post, order-products */ kebabCasePlural: joinWords(tableNamePlural, '-'),
    /* user, post, order_product */ snakeCasePlural: joinWords(tableNamePlural, '_'),
    /* User, Post, Order Product */ titleCaseSingular: titleCase(tableNameSingular),
    /* User, Post, Order product */ sentenceCaseSingular: capitalize(joinWords(tableNameSingular, ' ')),
    /* user, post, order product */ phraseCaseSingular: joinWords(tableNameSingular, ' '),
    /* User, Post, OrderProduct */ pascalCaseSingular: tableNameSingular.map(capitalize).join(''),
    /* user, post, orderProduct */ camelCaseSingular: tableNameSingular[0].toLowerCase() + tableNameSingular.slice(1).map(capitalize).join(''),
    /* user, post, order-product */ kebabCaseSingular: joinWords(tableNameSingular, '-'),
    /* user, post, order_product */ snakeCaseSingular: joinWords(tableNameSingular, '_'),
  };
}

export const getColumnDefaultDisplay = ({
  isPrimaryKey,
  isNullable,
  columnDefault,
}: {
  isPrimaryKey: boolean;
  isNullable: string;
  columnDefault: string | null | undefined;
}): string => {
  const isColumnDefaultNull = columnDefault === null;
  const isColumnNullable = isNullable === 'YES';

  if (isColumnDefaultNull) {
    return isColumnNullable ? String(columnDefault).toUpperCase() : '';
  }

  return (() => {
    if (isPrimaryKey) {
      return 'AUTO_INCREMENT';
    }

    if (columnDefault !== undefined) {
      return `'${String(columnDefault)}'`;
    }

    return 'No default';
  })();
};

export function getPrimaryKey({
  tableName,
  schemaInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
}): string {
  const tableSchema = schemaInfo.find(
    (schema) => schema.tableName === tableName,
  );

  if (!tableSchema) {
    throw new Error(`Table "${tableName}" not found in schema information.`);
  }

  const primaryKeyColumn = tableSchema.columnsInfo.find((column) =>
    Boolean(column.primary_key),
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
    ...(hasOne ?? []),
    ...(hasMany ?? []),
    ...(pivotRelationships ?? []).map((item) => item.relatedTable),
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
  //   const dbConnection = useFormStore.getState().dbConnection;
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
  const tableInfo =
    schemaInfo.find((rel) => rel.tableName === tableName) ?? null;

  if (tableInfo?.foreignKeys) {
    return tableInfo.foreignKeys.map((key) => {
      const referencedTable =
        tableInfo.foreignTables?.find((table) => key.startsWith(table)) ??
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

export function addPrimaryKeys(schema: IJSONSchema): IJSONSchema {
  const newSchema: IJSONSchema = {};

  Object.keys(schema).forEach((table) => {
    newSchema[table] = schema[table].map((row, index) => {
      const validPKFormats: string[] = [`${table}_id`, 'id'];
      const firstKey = Object.keys(row)[0];
      const isFirstKeyValidPKFormat = validPKFormats.includes(firstKey);
      if (!isFirstKeyValidPKFormat) {
        const primaryKey = `${table}_id`;
        const newRow: Record<string, unknown> = { [primaryKey]: index + 1 }; // Primary key as the first property

        // Add remaining properties
        Object.keys(row).forEach((key) => {
          if (key !== primaryKey) {
            newRow[key] = row[key];
          }
        });

        return newRow;
      }

      // Return unchanged first key since it's valid
      return row;
    });
  });

  return newSchema;
}
