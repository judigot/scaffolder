import { IFile } from '@/components/FileViewer';
import baseMethods from '@/frameworks/backend/laravel/base-methods';
import { createFile, replacePlaceholder } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { TableReplacements } from '@/interfaces/placeholders';
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
    const methodRoutes = baseMethods
      .filter((group) => group.group !== 'CRUD') // Skip CRUD
      .map(
        ({ group, methods }) =>
          `/* ${group.toUpperCase()} */\n${methods
            .map(({ route, description }) =>
              `// ${description}\n${route}`
                .replace(/{{tableNameKebabCasePlural}}/g, kebabCasePlural)
                .replace(/{{tableNamePascalCase}}/g, pascalCase),
            )
            .join('\n')}`,
      )
      .join('\n\n');

    const customRoutesForController = methodRoutes;

    const routeFileContent = `
  <?php

  use Illuminate\\Support\\Facades\\Route;
  use App\\Http\\Controllers\\{{tableNamePascalCase}}Controller;

  // Custom routes for {{tableNamePascalCase}}

  {{modelSpecificRoutes}}

  // Base routes

  {{customRoutesForController}}

  // Resource routes for {{tableNamePascalCase}}
  Route::apiResource('{{tableNameKebabCasePlural}}', {{tableNamePascalCase}}Controller::class);
  `;

    const customPlaceholders = {
      modelSpecificRoutes,
      customRoutesForController,
    };

    const tablePlaceholders: TableReplacements = {
      tableNamePascalCase: pascalCase,
      tableNameKebabCasePlural: kebabCasePlural,
    };

    return {
      type: 'file',
      name: `${kebabCasePlural}.php`,
      content: replacePlaceholder({
        template: routeFileContent,
        replacements: { ...tablePlaceholders, ...customPlaceholders },
      }),
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
