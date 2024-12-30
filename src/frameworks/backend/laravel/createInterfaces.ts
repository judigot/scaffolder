import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods.ts';
import { generateModelImports } from '@/utils/common.ts';
import { APP_SETTINGS } from '@/constants.ts';
import { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';

const template = `
<?php

namespace App\\Repositories;

{{modelImports}}
use App\\Models\\{{className}};
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

interface {{className}}Interface extends BaseInterface
{
{{modelSpecificMethods}}
}
`;

const createInterfaces = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const modelImports = generateModelImports(tableInfo);
      const modelSpecificMethods = generateModelSpecificMethods({
        targetTable: tableName,
        schemaInfo,
        fileToGenerate: 'interface',
      });

      const replacements = {
        className,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${className}Interface.php`,
        content,
      };
    });
};

export default createInterfaces;
