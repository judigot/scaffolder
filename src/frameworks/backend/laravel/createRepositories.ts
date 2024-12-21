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

use App\\Models\\{{className}};
{{modelImports}}
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseRepository;

class {{className}}Repository extends BaseRepository implements {{className}}Interface
{
    public function __construct({{className}} $model)
    {
        parent::__construct($model);
    }
{{modelSpecificMethods}}
}
`;

const createRepositories = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const modelSpecificMethods = generateModelSpecificMethods({
        targetTable: tableName,
        schemaInfo,
        fileToGenerate: 'repository',
      });
      const modelImports = generateModelImports(tableInfo);

      const replacements = {
        className,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${className}Repository.php`,
        content,
      };
    });
};

export default createRepositories;
