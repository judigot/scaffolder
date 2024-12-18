import { IFile } from '@/components/FileViewer';
import {
  CRUDOperations,
  QueryAndSearch,
  SoftDeletesAndRestoration,
  BulkOperations,
  RetrievalAndSorting,
  AdvancedOperations,
} from '@/frameworks/backend/laravel/base-methods';
import { createFile } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { changeCase } from '@/utils/common';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';

const template = `
<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

Route::middleware('api')->group(function () {
{{customRoutes}}
});
`;

const methodsAndContent = [
  { ...CRUDOperations },
  { ...QueryAndSearch },
  { ...SoftDeletesAndRestoration },
  { ...BulkOperations },
  { ...RetrievalAndSorting },
  { ...AdvancedOperations },
];

const createAPIRoutes = (schemaInfo: ISchemaInfo[]): IFile[] => {
  const routeFiles: IFile[] = schemaInfo.map((tableInfo) => {
    const { table } = tableInfo;
    const { pascalCase, kebabCasePlural } = changeCase(table);

    // Generate model-specific routes
    const modelSpecificRoutes = generateModelSpecificMethods({
      targetTable: table,
      schemaInfo,
      fileToGenerate: 'routes',
    });

    // Generate additional method-based routes
    const methodRoutes = methodsAndContent
      .filter((group) => group.group !== 'CRUD Operations') // Skip CRUD Operations
      .map((group) =>
        group.methods
          .map(({ route }) =>
            route
              .replace(/{{tableNameKebabCasePlural}}/g, kebabCasePlural)
              .replace(/{{tableNamePascalCase}}/g, pascalCase),
          )
          .join('\n'),
      )
      .join('\n');

    // Combine custom routes and resource route
    const customRoutesForController = `
      ${modelSpecificRoutes}
      ${methodRoutes}
    `;

    const routeFileContent = `
<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\${pascalCase}Controller;

// Custom routes for ${pascalCase}
${customRoutesForController}
// Resource routes for ${pascalCase}
Route::apiResource('${kebabCasePlural}', ${pascalCase}Controller::class);
`;

    return {
      type: 'file',
      name: `${kebabCasePlural}.php`,
      content: routeFileContent,
    };
  });

  // Create main `api.php` file to include all route files
  const customRoutes = routeFiles
    .map(({ name }) => `    require __DIR__ . '/${name}';`)
    .join('\n');

  const replacements = {
    customRoutes,
  };

  return [
    {
      type: 'file',
      name: 'api.php',
      content: createFile({ template, replacements }),
    },
    ...routeFiles, // Add individual route files for each table
  ];
};

export default createAPIRoutes;
