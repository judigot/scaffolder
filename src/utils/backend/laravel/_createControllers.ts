import { IFile } from '@/components/FileViewer';
import { APP_SETTINGS } from '@/constants';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { changeCase } from '@/utils/identifySchema';

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
  const controllers: IFile[] = [];

  schemaInfo.forEach(({ table, isPivot }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const className = schemaInfo.find((rel) => rel.table === table)?.tableCases
      .pascalCase;
    if (className == null) return;

    const controllerMethods = createControllerMethods({
      tableName: table,
      schemaInfo,
    });

    const template = `<?php
{{ownerComment}}

namespace App\\Http\\Controllers;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Interface;
use Illuminate\\Http\\Request;

class {{className}}Controller extends BaseController
{
${controllerMethods}
}
`;

    controllers.push({
      type: 'file',
      name: `${className}Controller.php`,
      content: template,
    });
  });

  return controllers;
};

export default createControllers;
