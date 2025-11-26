import { generateModelImports, changeCase } from '../../../utils/common';
import { APP_SETTINGS } from '../../../constants';
import { createFile } from '../../../helpers/stringHelper';
import generateDomainCode from '../../../utils/generateDomainCode';
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
const createRepositories = (schemaInfo) => {
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
