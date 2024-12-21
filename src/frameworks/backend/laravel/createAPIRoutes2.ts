import { createFile, replacePlaceholder } from '@/helpers/stringHelper.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods.ts';
import { APP_SETTINGS } from '@/constants.ts';
import { changeCase } from '@/utils/common.ts';
import { TableReplacements } from '@/interfaces/placeholders.ts';

const template = `
<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

{{useStatements}}
Route::middleware('api')->group(function () {
{{customRoutes}}
});
`;

const createAPIRoutes = (schemaInfo: ISchemaInfo[]): string => {
  const useStatements = schemaInfo
    .map(
      ({ tableName }) =>
        `use App\\Http\\Controllers\\${changeCase(tableName).pascalCase}Controller;\n`,
    )
    .join('');

  const customRoutes = schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName, columnsInfo } = tableInfo;
      const { pascalCase, kebabCasePlural } = changeCase(tableName);

      const firstColumn = columnsInfo[0]?.column_name || 'id';
      const secondColumn = columnsInfo[1]?.column_name || 'id';

      const modelSpecificRoutes = generateModelSpecificMethods({
        targetTable: tableName,
        schemaInfo,
        fileToGenerate: 'routes',
      });

      const customRoutesForController = `
        ${modelSpecificRoutes}
        // GET routes for retrieving data

        // Find records by specific attributes
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/find-by-attributes?${firstColumn}=value&${secondColumn}=value
        Route::get('{{tableNameKebabCase}}/find-by-attributes', [{{tableNamePascalCase}}Controller::class, 'findByAttributes']);

        // Order records by specified criteria
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/order-by?column=${firstColumn}&direction=asc
        Route::get('{{tableNameKebabCase}}/order-by', [{{tableNamePascalCase}}Controller::class, 'orderBy']);

        // Paginate records
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/paginate?page=1&per_page=10
        Route::get('{{tableNameKebabCase}}/paginate', [{{tableNamePascalCase}}Controller::class, 'paginate']);

        // Search for records based on certain criteria
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/search?query=searchTerm
        Route::get('{{tableNameKebabCase}}/search', [{{tableNamePascalCase}}Controller::class, 'search']);

        // Count the total number of records
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/count
        Route::get('{{tableNameKebabCase}}/count', [{{tableNamePascalCase}}Controller::class, 'count']);

        // Retrieve records with related models
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/with-relations?relations=relationName
        Route::get('{{tableNameKebabCase}}/with-relations', [{{tableNamePascalCase}}Controller::class, 'getWithRelations']);

        // Get the latest records based on a timestamp
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/latest
        Route::get('{{tableNameKebabCase}}/latest', [{{tableNamePascalCase}}Controller::class, 'latest']);

        // Get the oldest records based on a timestamp
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/oldest
        Route::get('{{tableNameKebabCase}}/oldest', [{{tableNamePascalCase}}Controller::class, 'oldest']);

        // Get a random set of records
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/random
        Route::get('{{tableNameKebabCase}}/random', [{{tableNamePascalCase}}Controller::class, 'random']);

        // Soft delete a specific record by ID
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/soft-delete/{id}
        Route::put('{{tableNameKebabCase}}/soft-delete/{id}', [{{tableNamePascalCase}}Controller::class, 'softDelete']);

        // Restore a soft-deleted record by ID
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/restore/{id}
        Route::put('{{tableNameKebabCase}}/restore/{id}', [{{tableNamePascalCase}}Controller::class, 'restore']);

        // Retrieve records including those that have been soft-deleted
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/with-trashed
        Route::get('{{tableNameKebabCase}}/with-trashed', [{{tableNamePascalCase}}Controller::class, 'withTrashed']);

        // Retrieve only soft-deleted records
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/only-trashed
        Route::get('{{tableNameKebabCase}}/only-trashed', [{{tableNamePascalCase}}Controller::class, 'onlyTrashed']);

        // Retrieve records excluding those that have been soft-deleted
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/without-trashed
        Route::get('{{tableNameKebabCase}}/without-trashed', [{{tableNamePascalCase}}Controller::class, 'withoutTrashed']);

        // POST routes for creating or updating data

        // Create or update a record
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/update-or-create
        Route::post('{{tableNameKebabCase}}/update-or-create', [{{tableNamePascalCase}}Controller::class, 'updateOrCreate']);

        // Batch update multiple records
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/batch-update
        Route::post('{{tableNameKebabCase}}/batch-update', [{{tableNamePascalCase}}Controller::class, 'batchUpdate']);

        // Find the first record that matches criteria or create a new one
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/first-or-create
        Route::post('{{tableNameKebabCase}}/first-or-create', [{{tableNamePascalCase}}Controller::class, 'firstOrCreate']);

        // Find the first record that matches criteria or return a new instance
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/first-or-new
        Route::post('{{tableNameKebabCase}}/first-or-new', [{{tableNamePascalCase}}Controller::class, 'firstOrNew']);

        // POST routes for specific queries that might involve complex filtering or ordering

        // Retrieve a list of specific column values
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/pluck
        Route::post('{{tableNameKebabCase}}/pluck', [{{tableNamePascalCase}}Controller::class, 'pluck']);

        // Filter records based on a set of values
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/where-in
        Route::post('{{tableNameKebabCase}}/where-in', [{{tableNamePascalCase}}Controller::class, 'whereIn']);

        // Filter records excluding a set of values
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/where-not-in
        Route::post('{{tableNameKebabCase}}/where-not-in', [{{tableNamePascalCase}}Controller::class, 'whereNotIn']);

        // Filter records between two values
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/where-between
        Route::post('{{tableNameKebabCase}}/where-between', [{{tableNamePascalCase}}Controller::class, 'whereBetween']);

        // Group records by specified criteria
        // Usage: http://localhost:8000/api/{{tableNameKebabCase}}/group-by
        Route::post('{{tableNameKebabCase}}/group-by', [{{tableNamePascalCase}}Controller::class, 'groupBy']);
      `;

      const tablePlaceholders: TableReplacements = {
        tableNamePascalCase: pascalCase,
        tableNameKebabCase: kebabCasePlural,
      };

      return replacePlaceholder({
        replacements: tablePlaceholders,
        template: `
        // Custom routes for {{tableNamePascalCase}}${customRoutesForController}
        // Resource routes for {{tableNamePascalCase}}
        Route::apiResource('{{tableNameKebabCase}}', {{tableNamePascalCase}}Controller::class);`,
      });
    })
    .join('\n');

  const replacements = {
    useStatements,
    customRoutes,
  };

  return createFile({ template, replacements });
};

export default createAPIRoutes;
