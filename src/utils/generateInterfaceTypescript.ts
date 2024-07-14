import identifyType from './identifyType';
import convertType from './convertType';
import { toPascalCase } from '../helpers/toPascalCase';

const collectColumnInfo = (
  records: Record<string, unknown>[],
): [Record<string, Set<string>>, Set<string>] => {
  const columnTypes: Record<string, Set<string>> = {};
  const nullableColumns = new Set<string>();

  records.forEach((record) => {
    Object.entries(record).forEach(([columnName, columnValue]) => {
      if (!Object.prototype.hasOwnProperty.call(columnTypes, columnName)) {
        columnTypes[columnName] = new Set();
      }
      columnTypes[columnName].add(identifyType(columnValue));
      if (columnValue === null) {
        nullableColumns.add(columnName);
      }
    });
  });

  return [columnTypes, nullableColumns];
};

const determineColumnTypes = (
  columnTypes: Record<string, Set<string>>,
  records: Record<string, unknown>[],
): Record<string, string> => {
  return Object.entries(columnTypes).reduce<Record<string, string>>(
    (columnTypeInfo, [columnName]) => {
      const sampleValue = records.find(
        (record) => record[columnName] !== null,
      )?.[columnName];
      columnTypeInfo[columnName] = convertType({
        value: sampleValue,
        targetType: 'typescript',
      });
      return columnTypeInfo;
    },
    {},
  );
};

const generateInterfaceString = (
  tableName: string,
  columnTypeInfo: Record<string, string>,
  nullableColumns: Set<string>,
): string => {
  const interfaceName = toPascalCase(tableName);
  const properties = Object.entries(columnTypeInfo)
    .map(
      ([columnName, columnType]) =>
        `  ${columnName}: ${columnType}${nullableColumns.has(columnName) ? ' | null' : ''};`,
    )
    .join('\n');

  return `export interface I${interfaceName} {\n${properties}\n}`;
};

const generateTypescriptInterfaces = (
  data: Record<string, Record<string, unknown>[]>,
): string => {
  return Object.entries(data)
    .map(([tableName, records]) => {
      const [columnTypes, nullableColumns] = collectColumnInfo(records);
      const columnTypeInfo = determineColumnTypes(columnTypes, records);
      return generateInterfaceString(
        tableName,
        columnTypeInfo,
        nullableColumns,
      );
    })
    .join('\n\n');
};

export default generateTypescriptInterfaces;
