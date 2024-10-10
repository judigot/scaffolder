import fs from 'fs';
import path from 'path';
import { convertToUrlFormat } from '@/helpers/stringHelper';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { APP_SETTINGS, ownerComment } from '@/constants';

const createAPIRoutes = (
  schemaInfo: ISchemaInfo[],
  outputFilePath: string,
): void => {
  const routesWithComment = `<?php\n${ownerComment}\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n`;

  const useStatements = schemaInfo
    .map(
      ({ tableCases: { pascalCase } }) =>
        `use App\\Http\\Controllers\\${pascalCase}Controller;\n`,
    )
    .join('');

  const customRoutes = schemaInfo
    .map(
      ({ table, tableCases: { plural, pascalCase }, columnsInfo, isPivot }) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (APP_SETTINGS.excludePivotTableFiles && isPivot) return '';

        const routeName = convertToUrlFormat(plural);
        const className = pascalCase;
        const firstColumn = columnsInfo[0]?.column_name || 'id'; // Fallback to 'id' if no columns exist
        const secondColumn = columnsInfo[1]?.column_name || 'id';

        const modelSpecificRoutes = generateModelSpecificMethods({
          targetTable: table,
          schemaInfo,
          fileToGenerate: 'routes',
        });

        // Additional custom routes for each controller
        const customRoutesForController = `
        ${modelSpecificRoutes}
        // GET routes for retrieving data

        // Find records by specific attributes
        // Usage: http://localhost:8000/api/${routeName}/find-by-attributes?${firstColumn}=value&${secondColumn}=value
        Route::get('${routeName}/find-by-attributes', [${className}Controller::class, 'findByAttributes']);

        // Order records by specified criteria
        // Usage: http://localhost:8000/api/${routeName}/order-by?column=${firstColumn}&direction=asc
        Route::get('${routeName}/order-by', [${className}Controller::class, 'orderBy']);

        // Paginate records
        // Usage: http://localhost:8000/api/${routeName}/paginate?page=1&per_page=10
        Route::get('${routeName}/paginate', [${className}Controller::class, 'paginate']);

        // Search for records based on certain criteria
        // Usage: http://localhost:8000/api/${routeName}/search?query=searchTerm
        Route::get('${routeName}/search', [${className}Controller::class, 'search']);

        // Count the total number of records
        // Usage: http://localhost:8000/api/${routeName}/count
        Route::get('${routeName}/count', [${className}Controller::class, 'count']);

        // Retrieve records with related models
        // Usage: http://localhost:8000/api/${routeName}/with-relations?relations=relationName
        Route::get('${routeName}/with-relations', [${className}Controller::class, 'getWithRelations']);

        // Get the latest records based on a timestamp
        // Usage: http://localhost:8000/api/${routeName}/latest
        Route::get('${routeName}/latest', [${className}Controller::class, 'latest']);

        // Get the oldest records based on a timestamp
        // Usage: http://localhost:8000/api/${routeName}/oldest
        Route::get('${routeName}/oldest', [${className}Controller::class, 'oldest']);

        // Get a random set of records
        // Usage: http://localhost:8000/api/${routeName}/random
        Route::get('${routeName}/random', [${className}Controller::class, 'random']);

        // Soft delete a specific record by ID
        // Usage: http://localhost:8000/api/${routeName}/soft-delete/{id}
        Route::get('${routeName}/soft-delete/{id}', [${className}Controller::class, 'softDelete']);

        // Restore a soft-deleted record by ID
        // Usage: http://localhost:8000/api/${routeName}/restore/{id}
        Route::get('${routeName}/restore/{id}', [${className}Controller::class, 'restore']);

        // Retrieve records including those that have been soft-deleted
        // Usage: http://localhost:8000/api/${routeName}/with-trashed
        Route::get('${routeName}/with-trashed', [${className}Controller::class, 'withTrashed']);

        // Retrieve only soft-deleted records
        // Usage: http://localhost:8000/api/${routeName}/only-trashed
        Route::get('${routeName}/only-trashed', [${className}Controller::class, 'onlyTrashed']);

        // Retrieve records excluding those that have been soft-deleted
        // Usage: http://localhost:8000/api/${routeName}/without-trashed
        Route::get('${routeName}/without-trashed', [${className}Controller::class, 'withoutTrashed']);

        // POST routes for creating or updating data

        // Create or update a record
        // Usage: http://localhost:8000/api/${routeName}/update-or-create
        Route::post('${routeName}/update-or-create', [${className}Controller::class, 'updateOrCreate']);

        // Batch update multiple records
        // Usage: http://localhost:8000/api/${routeName}/batch-update
        Route::post('${routeName}/batch-update', [${className}Controller::class, 'batchUpdate']);

        // Find the first record that matches criteria or create a new one
        // Usage: http://localhost:8000/api/${routeName}/first-or-create
        Route::post('${routeName}/first-or-create', [${className}Controller::class, 'firstOrCreate']);

        // Find the first record that matches criteria or return a new instance
        // Usage: http://localhost:8000/api/${routeName}/first-or-new
        Route::post('${routeName}/first-or-new', [${className}Controller::class, 'firstOrNew']);

        // POST routes for specific queries that might involve complex filtering or ordering

        // Retrieve a list of specific column values
        // Usage: http://localhost:8000/api/${routeName}/pluck
        Route::post('${routeName}/pluck', [${className}Controller::class, 'pluck']);

        // Filter records based on a set of values
        // Usage: http://localhost:8000/api/${routeName}/where-in
        Route::post('${routeName}/where-in', [${className}Controller::class, 'whereIn']);

        // Filter records excluding a set of values
        // Usage: http://localhost:8000/api/${routeName}/where-not-in
        Route::post('${routeName}/where-not-in', [${className}Controller::class, 'whereNotIn']);

        // Filter records between two values
        // Usage: http://localhost:8000/api/${routeName}/where-between
        Route::post('${routeName}/where-between', [${className}Controller::class, 'whereBetween']);

        // Group records by specified criteria
        // Usage: http://localhost:8000/api/${routeName}/group-by
        Route::post('${routeName}/group-by', [${className}Controller::class, 'groupBy']);
      `;

        return `
        // Custom routes for ${className}${customRoutesForController}
        // Resource routes for ${className}
        Route::resource('${routeName}', ${className}Controller::class);`;
      },
    )
    .join('\n');

  const content = `${routesWithComment}\n${useStatements}\nRoute::middleware('api')->group(function () {\n${customRoutes}\n});\n`;

  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, content);
};

export default createAPIRoutes;
