import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/common';
import { APP_SETTINGS } from '@/constants';
import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';
import { changeCase } from '@/utils/identifySchema';

const template = `
<?php

namespace App\\Repositories;

use App\\Models\\{{className}};
{{modelImports}}
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
      const { table } = tableInfo;
      const { pascalCase } = changeCase(table);
      const className = pascalCase;

      const modelImports = generateModelImports(tableInfo);
      const modelSpecificMethods = generateModelSpecificMethods({
        targetTable: table,
        schemaInfo,
        fileToGenerate: 'interface',
      });

      const replacements = {
        className,
        tableName: table,
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
