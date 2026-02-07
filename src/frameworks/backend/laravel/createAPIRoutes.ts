import type { IFile } from '@/components/FileViewer.tsx';
import baseMethods from '@/frameworks/base-methods/index.ts';
import { createFile, replacePlaceholder } from '@/helpers/stringHelper.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { TableReplacements } from '@/interfaces/placeholders.ts';
import { changeCase } from '@/utils/common.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';

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
    const { tableName } = tableInfo;
    const {
      pascalCase: tableNamePascalCase,
      kebabCasePlural: tableNameKebabCasePlural,
    } = changeCase(tableName);

    // Generate additional method-based routes
    const methodRoutes = baseMethods
      .filter((group) => group.group !== 'CRUD') // Skip CRUD
      .map(
        ({ group, methods }) =>
          `/* ${group.toUpperCase()} */\n${methods
            .map(({ route, description, methodName }) => {
              if (
                typeof route === 'string' &&
                typeof description === 'string'
              ) {
                return `// ${description}\n${replacePlaceholder({
                  template: route,
                  replacements: {
                    tableNameKebabCasePlural,
                    tableNamePascalCase,
                    methodName,
                  },
                })}`;
              }
              return '';
            })
            .join('\n')}`,
      )
      .join('\n\n');

    const baseRoutesForController = methodRoutes;

    const tablePlaceholders: TableReplacements = {
      tableNamePascalCase,
      tableNameKebabCasePlural,
    };

    const routeFileContent = `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\{{tableName.pascalCase}}Controller;

// Custom routes for {{tableName.pascalCase}}

{{modelSpecificRoutes}}

// Base routes

{{baseRoutesForController}}

// Resource routes for {{tableName.pascalCase}}
Route::apiResource('{{tableName.plural.kebabCase}}', {{tableName.pascalCase}}Controller::class);
`;

    const modelSpecificRoutes = generateDomainCode({
      schemaInfo,
      codeToGenerate: 'route',
      tableInfo,
      tableName,
    }).join('\n');

    return {
      type: 'file',
      name: `${tableNameKebabCasePlural}.php`,
      content: replacePlaceholder({
        template: routeFileContent,
        replacements: {
          ...tablePlaceholders,
          baseRoutesForController,
          modelSpecificRoutes,
        },
      }),
    };
  });

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
