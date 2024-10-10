import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces';
import { generateColumnDefinition, getTypeMapping } from '@/utils/common';

const generateTypescriptInterfaces = ({
  schemaInfo,
  includeTypeGuards,
}: {
  schemaInfo: ISchemaInfo[];
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
}): Record<string, string> => {
  const generateInterface = (
    table: string,
    columnsInfo: IColumnInfo[],
  ): string => {
    const interfaceName = table;
    const properties = columnsInfo
      .map((column) =>
        generateColumnDefinition({
          columnName: column,
          columnType: 'ts-interfaces',
        }),
      )
      .join('\n  ');
    return `export interface I${interfaceName} {\n  ${properties}\n}`;
  };

  const generateInterfaceContent = (
    table: string,
    columnsInfo: IColumnInfo[],
  ) => {
    const interfaceContent = generateInterface(table, columnsInfo);
    const typeGuardContent = includeTypeGuards
      ? generateTypeGuard(table, columnsInfo)
      : '';
    return `${interfaceContent}${typeGuardContent ? '\n' + typeGuardContent : ''}`;
  };

  const generateTypeGuard = (
    table: string,
    columnsInfo: IColumnInfo[],
  ): string => {
    const interfaceName = table;
    const typeGuardName = `isI${interfaceName}`;
    const propertyChecks = columnsInfo
      .map(({ column_name }) => `'${column_name}' in data`)
      .join(' &&\n    ');

    const typeChecks = columnsInfo
      .map(({ column_name, data_type, is_nullable }) => {
        const tsType = getTypeMapping(
          {
            column_name,
            data_type,
            primary_key: false,
            is_nullable,
            column_default: '',
            unique: false,
            foreign_key: null,
          },
          'ts-interfaces',
        );

        // Create a type check for Date
        if (tsType === 'Date') {
          return `typeof data.${column_name} === 'string'`;
        }

        // Handle nullable fields
        const nullableCheck =
          is_nullable === 'YES' ? `(data.${column_name} === null || ` : '';

        // Check for type with proper grouping
        return `${nullableCheck}typeof data.${column_name} === '${tsType}'${is_nullable === 'YES' ? ')' : ''}`;
      })
      .join(' &&\n    ');

    return `
export function ${typeGuardName}(data: unknown): data is I${interfaceName} {
  return (
    data !== null &&
    typeof data === 'object' &&
    ${propertyChecks} &&
    ${typeChecks}
  );
}

export function ${typeGuardName}Array(data: unknown): data is I${interfaceName}[] {
  return Array.isArray(data) && data.every(${typeGuardName});
}
`;
  };

  const filesContent: Record<string, string> = {};

  schemaInfo.forEach(
    ({ tableCases: { pascalCase }, columnsInfo }) =>
      (filesContent[`I${pascalCase}`] = generateInterfaceContent(
        pascalCase,
        columnsInfo,
      )),
  );

  return filesContent;
};

export default generateTypescriptInterfaces;
