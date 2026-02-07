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
use Illuminate\\Support\\Collection;
use App\\Models\\{{tableName.pascalCase}};
use App\\Repositories\\BaseRepository;

class {{tableName.pascalCase}}Repository extends BaseRepository implements {{tableName.pascalCase}}Interface
{
    public function __construct({{tableName.pascalCase}} $model)
    {
        parent::__construct($model);
    }
{{modelSpecificMethods}}
}
`;

const createRepositories = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot))
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);

      const modelImports = generateModelImports(tableInfo);

      const modelSpecificMethods = generateDomainCode({
        schemaInfo,
        tableInfo,
        tableName,
        codeToGenerate: 'repositoryContent',
      }).join('\n');

      const replacements = {
        tableNamePascalCase,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${tableNamePascalCase}Repository.php`,
        content,
      };
    });
};

export default createRepositories;
