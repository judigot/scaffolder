import { faker } from '@faker-js/faker';
import convertType from './convertType';

interface IFieldInfo {
  types: Set<string>;
  isPrimaryKey?: boolean;
  foreignKey?: {
    table: string;
    field: string;
  };
}

const MAX_ROWS = 100;

const generateMockData = (
  data: Record<string, Record<string, unknown>[]>,
): Record<string, Record<string, unknown>[]> => {
  const generatedData: Record<string, Record<string, unknown>[]> = {};

  Object.entries(data).forEach(([tableName, records]) => {
    const fieldInfo: Record<string, IFieldInfo> = {};

    records.forEach((record) => {
      Object.entries(record).forEach(([key, value]) => {
        if (!(key in fieldInfo)) {
          fieldInfo[key] = { types: new Set<string>() };
        }
        fieldInfo[key].types.add(value === null ? 'null' : typeof value);
      });
    });

    // Identify primary keys
    Object.keys(fieldInfo).forEach((key) => {
      if (key.endsWith('_id')) {
        fieldInfo[key].isPrimaryKey = true;
      }
    });

    // Identify foreign keys
    Object.entries(fieldInfo).forEach(([key, info]) => {
      if (!(info.isPrimaryKey ?? false) && key.endsWith('_id')) {
        const referencedTable = key.replace('_id', 's');
        info.foreignKey = { table: referencedTable, field: key };
      }
    });

    const mockRecords = [];

    for (let i = 0; i < MAX_ROWS; i++) {
      const mockRecord: Record<string, unknown> = {};

      let firstName = '';
      let lastName = '';

      Object.entries(fieldInfo).forEach(([rawColumnName, info]) => {
        const columnName = rawColumnName.toLowerCase();
        const sampleValue = records.find(
          (record) => record[rawColumnName] !== null,
        )?.[rawColumnName];

        const fieldType = convertType({
          primitiveType: [...info.types][0],
          value: sampleValue,
          targetType: 'typescript',
        });

        if (info.isPrimaryKey ?? false) {
          mockRecord[rawColumnName] = i + 1; // Generate ascending primary keys
          return;
        }

        if (info.foreignKey) {
          const { table, field } = info.foreignKey;
          const foreignRecords = generatedData[table];
          mockRecord[rawColumnName] = faker.helpers.arrayElement(
            foreignRecords.map((r) => r[field]),
          );
          return;
        }

        if (fieldType === 'string') {
          if (columnName.includes('password')) {
            mockRecord[rawColumnName] =
              '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m';
            return;
          }
          if (columnName.includes('email')) {
            if (firstName && lastName) {
              mockRecord[rawColumnName] = faker.internet
                .email({
                  firstName,
                  lastName,
                  allowSpecialCharacters: false,
                  provider: 'example.com',
                })
                .toLowerCase();
            } else {
              mockRecord[rawColumnName] = faker.internet
                .exampleEmail()
                .toLowerCase();
            }
            return;
          }
          if (columnName.includes('username')) {
            if (firstName && lastName) {
              mockRecord[rawColumnName] = faker.internet
                .userName({
                  firstName,
                  lastName,
                })
                .toLowerCase();
            } else {
              mockRecord[rawColumnName] = faker.internet
                .userName()
                .toLowerCase();
            }
            return;
          }
          if (
            columnName.includes('first_name') ||
            columnName.includes('firstname')
          ) {
            const generatedFirstName = faker.person.firstName();
            mockRecord[rawColumnName] = generatedFirstName;
            firstName = generatedFirstName;
            return;
          }
          if (
            columnName.includes('middle_name') ||
            columnName.includes('middlename')
          ) {
            mockRecord[rawColumnName] = faker.person.middleName();
            return;
          }
          if (
            columnName.includes('last_name') ||
            columnName.includes('lastname')
          ) {
            const generatedLastName = faker.person.lastName();
            mockRecord[rawColumnName] = generatedLastName;
            lastName = generatedLastName;
            return;
          }
          if (columnName.includes('_name')) {
            const fullName = faker.person.fullName();
            mockRecord[rawColumnName] = fullName;
            const nameParts = fullName.split(' ');
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
            return;
          }
          if (columnName.endsWith('_description')) {
            mockRecord[rawColumnName] = faker.lorem.sentence();
            return;
          }
          mockRecord[rawColumnName] = faker.lorem.word();
          return;
        }

        if (fieldType === 'number') {
          mockRecord[rawColumnName] = faker.number.int();
          return;
        }

        if (fieldType === 'boolean') {
          mockRecord[rawColumnName] = faker.datatype.boolean();
          return;
        }

        if (fieldType === 'Date') {
          mockRecord[rawColumnName] = faker.date.past();
          return;
        }

        mockRecord[rawColumnName] = null;
      });

      mockRecords.push(mockRecord);
    }

    generatedData[tableName] = mockRecords;
  });

  return generatedData;
};

export default generateMockData;
