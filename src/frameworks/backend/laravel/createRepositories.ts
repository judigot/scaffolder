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
      const { table } = tableInfo;
      const { pascalCase } = changeCase(table);
      const className = pascalCase;

      const modelSpecificMethods = generateModelSpecificMethods({
        targetTable: table,
        schemaInfo,
        fileToGenerate: 'repository',
      });
      const modelImports = generateModelImports(tableInfo);

      const replacements = {
        className,
        tableName: table,
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
