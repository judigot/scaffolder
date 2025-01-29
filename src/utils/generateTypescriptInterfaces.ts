import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';
import {
  changeCase,
  generateColumnDefinition,
  getTypeMapping,
} from '@/utils/common.ts';

const generateTypescriptInterfaces = ({
  schemaInfo,
  includeTypeGuards,
}: {
  schemaInfo: ISchemaInfo[];
  includeTypeGuards: boolean;
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
          columnType: 'typescript',
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
            is_nullable,
            column_default: '',
          },
          'typescript',
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

  schemaInfo.forEach(({ tableName, columnsInfo }) => {
    const { pascalCase } = changeCase(tableName);
    const className = pascalCase;
    return (filesContent[`I${className}`] = generateInterfaceContent(
      className,
      columnsInfo,
    ));
  });

  return filesContent;
};

export default generateTypescriptInterfaces;
