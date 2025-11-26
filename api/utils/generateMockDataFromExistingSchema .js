import { faker } from '@faker-js/faker';
const MAX_ROWS = 100;
const generateMockDataFromExistingSchema = (schema) => {
  const generatedData = {};
  schema.forEach(({ table_name, table_definition }) => {
    const { columns } = table_definition;
    const mockRecords = generateMockRecords(columns, generatedData);
    generatedData[table_name] = mockRecords;
  });
  return generatedData;
};
const generateMockRecords = (columns, generatedData) => {
  const mockRecords = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    const mockRecord = {};
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
const generateMockValueForColumn = (column, rowIndex, generatedData) => {
  const { data_type, primary_key, foreign_key } = column;
  if (primary_key) {
    return rowIndex + 1; // Generate ascending primary keys
  } else if (foreign_key) {
    return generateForeignKeyValue(foreign_key, generatedData);
  } else {
    return generateMockValue(data_type);
  }
};
const generateForeignKeyValue = (foreign_key, generatedData) => {
  const { foreign_table_name, foreign_column_name } = foreign_key;
  const foreignRecords = generatedData[foreign_table_name];
  /* Type guard to check if a value is a record */
  const isRecord = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };
  /* Ensure foreignRecords is an array */
  if (!Array.isArray(foreignRecords)) {
    throw new Error(`Data for table ${foreign_table_name} is not an array.`);
  }
  /* Filter out invalid records */
  const validRecords = foreignRecords.filter(isRecord);
  if (validRecords.length !== foreignRecords.length) {
    throw new Error(
      `Some records in table ${foreign_table_name} are not valid objects.`,
    );
  }
  /* Extract and return a random foreign key value */
  const foreignKeyValues = validRecords.map(
    (record) => record[foreign_column_name],
  );
  return faker.helpers.arrayElement(foreignKeyValues);
};
const generateMockValue = (dataType) => {
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
