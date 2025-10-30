import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelImports, changeCase } from '@/utils/common.ts';
import { APP_SETTINGS } from '@/constants.ts';
import type { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';

const template = `
<?php

namespace App\\Repositories;

{{modelImports}}
use App\\Models\\{{tableNamePascalCase}};
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

interface {{tableNamePascalCase}}Interface extends BaseInterface
{
{{modelSpecificMethods}}
}
`;

const createInterfaces = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);

      const modelImports = generateModelImports(tableInfo);

      const modelSpecificMethodsArray = generateDomainCode({
        schemaInfo,
        tableInfo,
        tableName,
        codeToGenerate: 'repositoryMethod',
      });
      const modelSpecificMethods =
        modelSpecificMethodsArray.length > 0
          ? modelSpecificMethodsArray.join(';\n') + ';'
          : '';

      const replacements = {
        tableNamePascalCase,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${tableNamePascalCase}Interface.php`,
        content,
      };
    });
};

export default createInterfaces;
