import { APP_SETTINGS } from '../../../constants';
import { createFile } from '../../../helpers/stringHelper';
import { changeCase } from '../../../utils/common';
import generateDomainCode from '../../../utils/generateDomainCode';
const template = `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\{{tableNamePascalCase}};
use App\\Repositories\\{{tableNamePascalCase}}Interface;
use App\\Services\\{{tableNamePascalCase}}Service;
use Illuminate\\Http\\Request;
use App\\Http\\Controllers\\BaseController;

class {{tableNamePascalCase}}Controller extends BaseController
{
    protected $repository;

    public function __construct({{tableNamePascalCase}}Interface \${{tableName}}Repository, {{tableNamePascalCase}}Service \${{tableName}}Service)
    {
        parent::__construct(\${{tableName}}Service);
        $this->repository = \${{tableName}}Repository;
    }

{{controllerMethods}}
}
`;
const createControllers = (schemaInfo) => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);
      const controllerMethods = generateDomainCode({
        schemaInfo,
        tableInfo,
        tableName,
        codeToGenerate: 'controllerContent',
      }).join('\n');
      const replacements = {
        tableNamePascalCase,
        tableName,
        controllerMethods,
      };
      const content = createFile({ template, replacements });
      return {
        type: 'file',
        name: `${tableNamePascalCase}Controller.php`,
        content,
      };
    });
};
export default createControllers;
