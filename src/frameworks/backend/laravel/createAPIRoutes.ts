import { APP_SETTINGS } from '@/constants';
import {
  CRUDOperations,
  QueryAndSearch,
  SoftDeletesAndRestoration,
  BulkOperations,
  RetrievalAndSorting,
  AdvancedOperations,
} from '@/frameworks/backend/laravel/base-methods';
import { createFile, replacePlaceholder } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { TableReplacements } from '@/interfaces/placeholders';
import { changeCase } from '@/utils/common';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';

const template = `
<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

{{useStatements}}
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

const createAPIRoutes = (schemaInfo: ISchemaInfo[]): string => {
  const useStatements = schemaInfo
    .map(
      ({ table }) =>
        `use App\\Http\\Controllers\\${changeCase(table).pascalCase}Controller;\n`,
    )
    .join('');

  const customRoutes = schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { table } = tableInfo;
      const { pascalCase, kebabCasePlural } = changeCase(table);

      // Generate model-specific routes
      const modelSpecificRoutes = generateModelSpecificMethods({
        targetTable: table,
        schemaInfo,
        fileToGenerate: 'routes',
      });

      const methodRoutes = methodsAndContent
        .filter((group) => group.group !== 'CRUD Operations') // Skip CRUD Operations as they are covered by apiResource
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

      const customRoutesForController = `
        ${modelSpecificRoutes}
        ${methodRoutes}
      `;

      const tablePlaceholders: TableReplacements = {
        tableNamePascalCase: pascalCase,
        tableNameKebabCasePlural: kebabCasePlural,
      };

      return replacePlaceholder({
        replacements: { ...tablePlaceholders },
        template: `
          // Custom routes for {{tableNamePascalCase}}
          ${customRoutesForController}
          // Resource routes for {{tableNamePascalCase}}
          Route::apiResource('{{tableNameKebabCasePlural}}', {{tableNamePascalCase}}Controller::class);
        `,
      });
    })
    .filter(Boolean)
    .join('\n');

  const replacements = {
    useStatements,
    customRoutes,
  };

  return createFile({ template, replacements });
};

export default createAPIRoutes;
