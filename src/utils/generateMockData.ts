import { faker } from '@faker-js/faker';

interface IFieldInfo {
  types: Set<string>;
  isPrimaryKey?: boolean;
  foreignKey?: {
    table: string;
    field: string;
  };
}

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

    for (let i = 0; i < 10; i++) {
      const mockRecord: Record<string, unknown> = {};

      Object.entries(fieldInfo).forEach(([key, info]) => {
        const types = Array.from(info.types);

        if (info.isPrimaryKey ?? false) {
          mockRecord[key] = i + 1; // Generate ascending primary keys
        } else if (info.foreignKey) {
          const { table, field } = info.foreignKey;
          const foreignRecords = generatedData[table] as Record<
            string,
            unknown
          >[];
          mockRecord[key] = faker.helpers.arrayElement(
            foreignRecords.map((r) => r[field]),
          );
        } else if (types.includes('string')) {
          if (key.endsWith('_name')) {
            mockRecord[key] = faker.lorem.word();
          } else if (key.endsWith('_description')) {
            mockRecord[key] = faker.lorem.sentence();
          } else {
            mockRecord[key] = faker.lorem.word();
          }
        } else if (types.includes('number')) {
          mockRecord[key] = faker.number.int();
        } else if (types.includes('boolean')) {
          mockRecord[key] = faker.datatype.boolean();
        } else if (types.includes('object')) {
          if (records.some((r) => r[key] instanceof Date)) {
            mockRecord[key] = faker.date.past();
          } else {
            mockRecord[key] = null;
          }
        } else {
          mockRecord[key] = null;
        }
      });

      mockRecords.push(mockRecord);
    }

    generatedData[tableName] = mockRecords;
  });

  return generatedData;
};

export default generateMockData;
