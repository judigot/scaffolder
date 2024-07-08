import { faker } from '@faker-js/faker';

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
): Record<string, unknown[]> => {
  const generatedData: Record<string, unknown[]> = {};

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

      Object.entries(fieldInfo).forEach(([rawColumnName, info]) => {
        const types = Array.from(info.types);
        const columnName = rawColumnName.toLowerCase();

        if (info.isPrimaryKey ?? false) {
          mockRecord[rawColumnName] = i + 1; // Generate ascending primary keys
          return;
        }

        if (info.foreignKey) {
          const { table, field } = info.foreignKey;
          const foreignRecords = generatedData[table] as Record<
            string,
            unknown
          >[];
          mockRecord[rawColumnName] = faker.helpers.arrayElement(
            foreignRecords.map((r) => r[field]),
          );
          return;
        }

        if (types.includes('string')) {
          if (
            columnName.includes('first_name') ||
            columnName.includes('firstname')
          ) {
            mockRecord[rawColumnName] = faker.person.firstName();
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
            mockRecord[rawColumnName] = faker.person.lastName();
            return;
          }
          if (columnName.includes('_name')) {
            mockRecord[rawColumnName] = faker.person.fullName();
            return;
          }
          if (columnName.endsWith('_description')) {
            mockRecord[rawColumnName] = faker.lorem.sentence();
            return;
          }
          mockRecord[rawColumnName] = faker.lorem.word();
          return;
        }

        if (types.includes('number')) {
          mockRecord[rawColumnName] = faker.number.int();
          return;
        }

        if (types.includes('boolean')) {
          mockRecord[rawColumnName] = faker.datatype.boolean();
          return;
        }

        if (types.includes('object')) {
          if (records.some((r) => r[rawColumnName] instanceof Date)) {
            mockRecord[rawColumnName] = faker.date.past();
          } else {
            mockRecord[rawColumnName] = null;
          }
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
