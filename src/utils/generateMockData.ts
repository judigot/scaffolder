import { faker } from '@faker-js/faker';

interface IFieldInfo {
  types: Set<string>;
}

const generateMockData = (
  data: Record<string, unknown[]>,
): Record<string, unknown[]> => {
  const generatedData: Record<string, unknown[]> = {};

  Object.entries(data).forEach(([tableName, records]) => {
    const fieldInfo: Record<string, IFieldInfo> = {};

    records.forEach((record) => {
      Object.entries(record as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (!(key in fieldInfo)) {
            fieldInfo[key] = { types: new Set<string>() };
          }
          fieldInfo[key].types.add(value === null ? 'null' : typeof value);
        },
      );
    });

    const mockRecords = [];

    for (let i = 0; i < 10; i++) {
      const mockRecord: Record<string, unknown> = {};

      Object.entries(fieldInfo).forEach(([key, info]) => {
        const types = Array.from(info.types);

        if (types.includes('string')) {
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
          if (
            (records as Record<string, unknown>[]).some(
              (r) => r[key] instanceof Date,
            )
          ) {
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
