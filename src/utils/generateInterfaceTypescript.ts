import inferType from './inferType';

const determineFieldType = (types: Set<string>): string => {
  if (types.has('string')) {
    return 'string';
  }
  if (types.has('float')) {
    return 'float';
  }
  if (types.has('number')) {
    return 'number';
  }
  if (types.has('boolean')) {
    return 'boolean';
  }
  return 'unknown';
};

const generateTypescriptInterfaces = (
  data: Record<string, unknown[]>,
): string => {
  return Object.entries(data as Record<string, Record<string, unknown>[]>)
    .map(([tableName, records]) => {
      const fields: Record<string, Set<string>> = {};
      const nullableFields = new Set<string>();

      // Collect all possible values for each property
      records.forEach((record) => {
        Object.entries(record).forEach(([key, value]) => {
          if (!(key in fields)) {
            fields[key] = new Set([inferType(value)]);
          } else {
            fields[key].add(inferType(value));
          }
          if (value === null) {
            nullableFields.add(key);
          }
        });
      });

      // Determine the type for each field based on collected values
      const fieldTypeInfo = Object.entries(fields).reduce<
        Record<string, string>
      >((acc, [key, types]) => {
        acc[key] = determineFieldType(types);
        return acc;
      }, {});

      const interfaceName =
        tableName.charAt(0).toUpperCase() + tableName.slice(1);
      const properties = Object.entries(fieldTypeInfo)
        .map(
          ([key, type]) =>
            `  ${key}${nullableFields.has(key) ? '?' : ''}: ${type};`,
        )
        .join('\n');

      return `export interface ${interfaceName} {\n${properties}\n}`;
    })
    .join('\n\n');
};

export default generateTypescriptInterfaces;