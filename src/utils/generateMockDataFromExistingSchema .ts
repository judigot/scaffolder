import { faker } from '@faker-js/faker';

interface IForeignKey {
  foreign_table_name: string;
  foreign_column_name: string;
}

interface IColumnDefinition {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
  check_constraints: string[];
  foreign_key: IForeignKey | null;
}

interface ITableDefinition {
  columns: IColumnDefinition[];
}

interface ITableSchema {
  table_name: string;
  table_definition: ITableDefinition;
}

const MAX_ROWS = 100;

const generateMockDataFromExistingSchema = (
  schema: ITableSchema[],
): Record<string, unknown[]> => {
  const generatedData: Record<string, unknown[]> = {};

  schema.forEach(({ table_name, table_definition }) => {
    const { columns } = table_definition;
    const mockRecords = generateMockRecords(columns, generatedData);
    generatedData[table_name] = mockRecords;
  });

  return generatedData;
};

const generateMockRecords = (
  columns: IColumnDefinition[],
  generatedData: Record<string, unknown[]>,
): Record<string, unknown>[] => {
  const mockRecords: Record<string, unknown>[] = [];

  for (let i = 0; i < MAX_ROWS; i++) {
    const mockRecord: Record<string, unknown> = {};

    columns.forEach((column) => {
      mockRecord[column.column_name] = generateMockValueForColumn(
        column,
        i,
        generatedData,
      );
    });

    mockRecords.push(mockRecord);
  }

  return mockRecords;
};

const generateMockValueForColumn = (
  column: IColumnDefinition,
  rowIndex: number,
  generatedData: Record<string, unknown[]>,
): unknown => {
  const { data_type, primary_key, foreign_key } = column;

  if (primary_key) {
    return rowIndex + 1; // Generate ascending primary keys
  } else if (foreign_key) {
    return generateForeignKeyValue(foreign_key, generatedData);
  } else {
    return generateMockValue(data_type);
  }
};

const generateForeignKeyValue = (
  foreign_key: IForeignKey,
  generatedData: Record<string, unknown[]>,
): unknown => {
  const { foreign_table_name, foreign_column_name } = foreign_key;
  const foreignRecords = generatedData[foreign_table_name] as Record<
    string,
    unknown
  >[];
  return faker.helpers.arrayElement(
    foreignRecords.map((r) => r[foreign_column_name]),
  );
};

const generateMockValue = (dataType: string): unknown => {
  switch (dataType) {
    case 'bigint':
      return faker.number.int();
    case 'text':
      return faker.lorem.word();
    case 'timestamp without time zone':
      return faker.date.past().toISOString();
    case 'boolean':
      return faker.datatype.boolean();
    default:
      return null;
  }
};

export default generateMockDataFromExistingSchema;
