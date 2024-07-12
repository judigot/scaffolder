import identifyType from './identifyType';
import convertType from './convertType';
import { toPascalCase } from '../helpers/toPascalCase';

const generateTypescriptInterfaces = (
  data: Record<string, Record<string, unknown>[]>,
): string => {
  return Object.entries(data)
    .map(([tableName, records]) => {
      const fields: Record<string, Set<string>> = {};
      const nullableFields = new Set<string>();

      // Collect all possible values for each property
      records.forEach((record) => {
        Object.entries(record).forEach(([key, value]) => {
          if (!(key in fields)) {
            fields[key] = new Set([identifyType(value)]);
          } else {
            fields[key].add(identifyType(value));
          }
          if (value === null) {
            nullableFields.add(key);
          }
        });
      });

      // Determine the type for each field based on collected values
      const fieldTypeInfo = Object.entries(fields).reduce<
        Record<string, string>
      >((acc, [key]) => {
        const sampleValue = records.find((record) => record[key] !== null)?.[
          key
        ];
        acc[key] = convertType({
          // primitiveType: [...types][0],
          value: sampleValue,
          targetType: 'typescript',
        });
        return acc;
      }, {});

      const interfaceName = toPascalCase(tableName);
      const properties = Object.entries(fieldTypeInfo)
        .map(([key, type]) => {
          return `  ${key}: ${type}${nullableFields.has(key) ? ' | null' : ''};`;
        })
        .join('\n');

      return `export interface I${interfaceName} {\n${properties}\n}`;
    })
    .join('\n\n');
};

export default generateTypescriptInterfaces;
