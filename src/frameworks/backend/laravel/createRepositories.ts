import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelImports } from '@/utils/common.ts';
import { APP_SETTINGS } from '@/constants.ts';
import { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';

const template = `
<?php

namespace App\\Repositories;

{{modelImports}}
use Illuminate\\Support\\Collection;
use App\\Models\\{{tableNamePascalCase}};
use App\\Repositories\\BaseRepository;

class {{tableNamePascalCase}}Repository extends BaseRepository implements {{tableNamePascalCase}}Interface
{
    public function __construct({{tableNamePascalCase}} $model)
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
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);

      const modelImports = generateModelImports(tableInfo);

      const modelSpecificMethods = generateDomainCode({
        tableInfo,
        tableName,
        codeToGenerate: 'repositoryContent',
      });

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
