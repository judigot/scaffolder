import { IFile } from '@/components/FileViewer.tsx';
import { APP_SETTINGS } from '@/constants.ts';
import { createFile } from '@/helpers/stringHelper.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods.ts';
import { changeCase } from '@/utils/common.ts';

const template = `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Interface;
use App\\Services\\{{className}}Service;
use Illuminate\\Http\\Request;

class {{className}}Controller extends BaseController
{
    protected $repository;

    public function __construct({{className}}Interface \${{tableName}}Repository, {{className}}Service \${{tableName}}Service)
    {
        parent::__construct(\${{tableName}}Service);
        $this->repository = \${{tableName}}Repository;
    }
{{controllerMethods}}
}
`;

const createControllerMethods = ({
  tableName,
  schemaInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
}): string => {
  const modelSpecificMethods = generateModelSpecificMethods({
    targetTable: tableName,
    schemaInfo,
    fileToGenerate: 'controllerMethod',
  });

  return modelSpecificMethods;
};

const createControllers = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map(({ tableName }) => {
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const controllerMethods = createControllerMethods({
        tableName,
        schemaInfo,
      });

      const replacements = {
        className,
        tableName,
        controllerMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${className}Controller.php`,
        content,
      };
    });
};

export default createControllers;
