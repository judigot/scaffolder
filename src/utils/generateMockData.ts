import { faker } from '@faker-js/faker';
import type { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { sortTablesBasedOnHierarchy } from '@/utils/sortTablesBasedOnHierarchy.ts';

interface IFieldInfo {
  types: Set<string>;
  isPrimaryKey?: boolean;
  foreignKey?: {
    table: string;
    field: string;
  };
  isNullable?: boolean;
}

// const MAX_ROWS = 10;
const NULL_ROWS = 1; // Must not be greater than MAX_ROWS

const generateMockData = ({
  mockDataRows,
  schemaInfo,
  dbType = 'postgresql',
  useCamelCase = false,
}: {
  mockDataRows: number;
  schemaInfo: ISchemaInfo[];
  dbType?: 'postgresql' | 'mysql';
  useCamelCase?: boolean;
}): ParsedJSONSchema => {
  faker.seed(1337);
  const generatedData: ParsedJSONSchema = {};
  const sortedRelationships = sortTablesBasedOnHierarchy(schemaInfo);

  sortedRelationships.forEach(({ tableName, columnsInfo }) => {
    const fieldInfo: Record<string, IFieldInfo> = {};

    columnsInfo.forEach((column) => {
      const { column_name, data_type, primary_key, foreign_key, is_nullable } =
        column;

      if (!(column_name in fieldInfo)) {
        fieldInfo[column_name] = {
          types: new Set<string>(),
          isNullable: is_nullable === 'YES',
        };
      }
      fieldInfo[column_name].types.add(data_type);
      fieldInfo[column_name].isPrimaryKey = primary_key;
      if (foreign_key) {
        fieldInfo[column_name].foreignKey = {
          table: foreign_key.foreign_table_name,
          field: foreign_key.foreign_column_name,
        };
      }
    });

    const mockRecords: Record<string, unknown>[] = [];

    // Helper to get the output key name (camelCase or original)
    const getKey = (name: string): string =>
      useCamelCase ? changeCase(name).camelCase : name;

    for (let i = 0; i < mockDataRows; i++) {
      const mockRecord: Record<string, unknown> = {};

      let firstName = '';
      let lastName = '';

      Object.entries(fieldInfo).forEach(([rawColumnName, info]) => {
        const columnName = rawColumnName.toLowerCase();
        const fieldType = Array.from(info.types)[0];
        const outputKey = getKey(rawColumnName);

        if (info.isPrimaryKey ?? false) {
          mockRecord[outputKey] = i + 1; // Generate ascending primary keys
          return;
        }

        if (info.foreignKey) {
          const { table, field } = info.foreignKey;
          const foreignRecords = generatedData[table];
          // Foreign key field needs to match the output format
          const foreignKey = getKey(field);
          mockRecord[outputKey] = foreignRecords[i][foreignKey]; // Use a unique value from foreign key records
          return;
        }

        if ((info.isNullable ?? false) && i < NULL_ROWS) {
          // Make the first rows contain nulls for nullable columns
          mockRecord[outputKey] = null;
          return;
        }

        if (fieldType === 'string') {
          if (columnName.includes('password')) {
            mockRecord[outputKey] =
              '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m';
            return;
          }
          if (columnName.includes('email')) {
            if (firstName && lastName) {
              mockRecord[outputKey] = faker.internet
                .email({ firstName, lastName, provider: 'example.com' })
                .toLowerCase();
            } else {
              mockRecord[outputKey] = faker.internet
                .exampleEmail()
                .toLowerCase();
            }
            return;
          }
          if (columnName.includes('username')) {
            if (firstName && lastName) {
              mockRecord[outputKey] = faker.internet
                .username({ firstName, lastName })
                .toLowerCase();
            } else {
              mockRecord[outputKey] = faker.internet.username().toLowerCase();
            }
            return;
          }
          if (
            columnName.includes('name') ||
            columnName.includes('first_name') ||
            columnName.includes('firstname')
          ) {
            const generatedFirstName = faker.person.firstName();
            mockRecord[outputKey] = generatedFirstName;
            firstName = generatedFirstName;
            return;
          }
          if (
            columnName.includes('middle_name') ||
            columnName.includes('middlename')
          ) {
            mockRecord[outputKey] = faker.person.middleName();
            return;
          }
          if (
            columnName.includes('last_name') ||
            columnName.includes('lastname')
          ) {
            const generatedLastName = faker.person.lastName();
            mockRecord[outputKey] = generatedLastName;
            lastName = generatedLastName;
            return;
          }
          if (columnName.includes('_name')) {
            const fullName = faker.person.fullName();
            mockRecord[outputKey] = fullName;
            const nameParts = fullName.split(' ');
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
            return;
          }
          if (columnName.endsWith('_description')) {
            mockRecord[outputKey] = faker.lorem.sentence();
            return;
          }
          mockRecord[outputKey] = faker.lorem.word();
          return;
        }

        if (fieldType === 'number') {
          mockRecord[outputKey] = faker.number.int();
          return;
        }

        if (fieldType === 'boolean') {
          mockRecord[outputKey] = faker.datatype.boolean();
          return;
        }

        if (fieldType === 'Date') {
          const pastDate: Date = faker.date.past();

          // Extract milliseconds and pad to 6 digits
          const milliseconds = pastDate.getMilliseconds();
          const microseconds = `${String(milliseconds)}000`.slice(0, 3); // Pad to 6 digits

          if (dbType === 'postgresql') {
            // Format as ISO 8601 with padded microseconds for PostgreSQL
            const formattedDate = `${pastDate.toISOString().split('.')[0]}.${microseconds}Z`;
            mockRecord[outputKey] = formattedDate;
          }

          if (dbType === 'mysql') {
            // Format as 'YYYY-MM-DD HH:mm:ss.ffffff' for MySQL
            const formattedDate = `${pastDate.toISOString().replace('T', ' ').split('.')[0]}.${microseconds}`;
            mockRecord[outputKey] = formattedDate;
          }

          return;
        }

        mockRecord[outputKey] = null;
      });

      mockRecords.push(mockRecord);
    }

    generatedData[tableName] = mockRecords;
  });

  // Return the object sorted based on hierarchy
  const sortedData: ParsedJSONSchema = {};
  sortedRelationships.forEach(({ tableName }) => {
    sortedData[tableName] = generatedData[tableName];
  });

  return sortedData;
};

export default generateMockData;
