import { IFile } from '@/components/FileViewer';
import { APP_SETTINGS } from '@/constants';
import { createFile } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { changeCase } from '@/utils/common';

const template = `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Interface;
use App\\Services\\{{className}}Service;
use Illuminate\\Http\\Request;

class {{className}}Controller extends BaseController
{
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
  const model = changeCase(tableName).pascalCase;
  const modelLowercase = model.toLowerCase();
  const repositoryVariable = `${modelLowercase}Repository`;
  const serviceVariable = `${modelLowercase}Service`;

  const modelSpecificMethods = generateModelSpecificMethods({
    targetTable: tableName,
    schemaInfo,
    fileToGenerate: 'controllerMethod',
  });

  return `
      protected $repository;

      public function __construct(${model}Interface $${repositoryVariable}, ${model}Service $${serviceVariable})
      {
          parent::__construct($${serviceVariable}); // Pass the service to BaseController
          $this->repository = $${repositoryVariable}; // Initialize the repository
      }

      ${modelSpecificMethods}
    `;
};

const createControllers = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map(({ table }) => {
      const { pascalCase } = changeCase(table);
      const className = pascalCase;

      const controllerMethods = createControllerMethods({
        tableName: table,
        schemaInfo,
      });

      const replacements = {
        className,
        tableName: table,
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
