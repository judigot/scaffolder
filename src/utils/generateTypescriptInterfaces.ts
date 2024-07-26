import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces';
import { getColumnDefinition, getTypeMapping } from '@/utils/common';

interface IGenerateOptions {
  schemaInfo: ISchemaInfo[];
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
}

const generateTypescriptInterfaces = ({
  schemaInfo,
  includeTypeGuards,
  outputOnSingleFile,
}: IGenerateOptions): string | Record<string, string> => {
  const generateInterface = (
    table: string,
    columnsInfo: IColumnInfo[],
  ): string => {
    const interfaceName = toPascalCase(table);
    const properties = columnsInfo
      .map((col) => getColumnDefinition(col, 'ts-interfaces'))
      .join('\n  ');
    return `export interface I${interfaceName} {\n  ${properties}\n}`;
  };

  const generateTypeGuard = (
    table: string,
    columnsInfo: IColumnInfo[],
  ): string => {
    const interfaceName = toPascalCase(table);
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
        const nullableCheck =
          is_nullable === 'YES' ? `data.${column_name} === null || ` : '';
        return `${nullableCheck}typeof data.${column_name} === '${tsType}'`;
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
}`;
  };

  if (outputOnSingleFile) {
    const content = schemaInfo
      .map(({ table, columnsInfo }) => {
        const interfaceContent = generateInterface(table, columnsInfo);
        const typeGuardContent = includeTypeGuards
          ? generateTypeGuard(table, columnsInfo)
          : '';
        return `${interfaceContent}${typeGuardContent ? '\n' + typeGuardContent : ''}`;
      })
      .join('\n\n');
    return content;
  } else {
    const filesContent: Record<string, string> = {};
    schemaInfo.forEach(({ table, columnsInfo }) => {
      const interfaceName = `I${toPascalCase(table)}`;
      const interfaceContent = generateInterface(table, columnsInfo);
      const typeGuardContent = includeTypeGuards
        ? generateTypeGuard(table, columnsInfo)
        : '';
      filesContent[interfaceName] = `${interfaceContent}\n${typeGuardContent}`;
    });
    return filesContent;
  }
};

export default generateTypescriptInterfaces;
