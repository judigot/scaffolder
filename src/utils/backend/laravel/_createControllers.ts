import { IFile } from '@/components/FileViewer';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { createFile } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { changeCase } from '@/utils/identifySchema';

const TEMPLATE = `<?php
{{ownerComment}}

namespace App\\Http\\Controllers;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Interface;
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

  const modelSpecificMethods = generateModelSpecificMethods({
    targetTable: tableName,
    schemaInfo,
    fileToGenerate: 'controllerMethod',
  });

  return `
      protected $repository;
  
      public function __construct(${model}Interface $${repositoryVariable})
      {
          $this->repository = $${repositoryVariable};
      }

      ${modelSpecificMethods}
    `;
};

const createControllers = (
  schemaInfo: ISchemaInfo[],
  // framework: keyof typeof frameworkDirectories,
): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { table, tableCases } = tableInfo;
      const className = tableCases.pascalCase;

      const controllerMethods = createControllerMethods({
        tableName: table,
        schemaInfo,
      });

      const replacements = {
        ownerComment,
        className,
        tableName: table,
        controllerMethods,
      };

      const content = createFile(TEMPLATE, replacements);

      return {
        type: 'file',
        name: `${className}Controller.php`,
        content,
      };
    });
};

export default createControllers;
