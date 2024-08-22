import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';

const getOwnerComment = (extension: string): string => {
  const comments: Record<string, string> = {
    '.php': '/* Owner: App Scaffolder */\n',
  };
  return comments[extension] || '/* Owner: App Scaffolder */\n';
};

const createAPIRoutes = (
  schemaInfo: ISchemaInfo[],
  outputFilePath: string,
): void => {
  const ownerComment = getOwnerComment('.php');
  const routesWithComment = `<?php\n${ownerComment}\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n`;

  const useStatements = schemaInfo
    .map(
      ({ table }) =>
        `use App\\Http\\Controllers\\${toPascalCase(table)}Controller;\n`,
    )
    .join('');

  const customRoutes = schemaInfo
    .map(({ table: tableName }) => {
      const routeName = tableName.endsWith('s') ? tableName : `${tableName}s`; // Ensure plural routes
      const className = toPascalCase(tableName);

      const modelSpecificRoutes = (() => {
        const foundSchemaInfo = schemaInfo.find(
          (tableInfo) => tableInfo.table === tableName,
        );
        return foundSchemaInfo
          ? generateModelSpecificMethods({
              schemaInfo: foundSchemaInfo,
              fileToGenerate: 'routes',
            })
          : '';
      })();

      // Additional custom routes for each controller
      const customRoutesForController = `
        ${modelSpecificRoutes}
        Route::get('${routeName}/find-by-attributes', [${className}Controller::class, 'findByAttributes']);
        Route::get('${routeName}/paginate', [${className}Controller::class, 'paginate']);
        Route::get('${routeName}/search', [${className}Controller::class, 'search']);
        Route::get('${routeName}/count', [${className}Controller::class, 'count']);
        Route::get('${routeName}/with-relations', [${className}Controller::class, 'getWithRelations']);
        Route::get('${routeName}/latest', [${className}Controller::class, 'latest']);
        Route::get('${routeName}/oldest', [${className}Controller::class, 'oldest']);
        Route::get('${routeName}/random', [${className}Controller::class, 'random']);
        Route::get('${routeName}/soft-delete/{id}', [${className}Controller::class, 'softDelete']);
        Route::get('${routeName}/restore/{id}', [${className}Controller::class, 'restore']);
        Route::get('${routeName}/with-trashed', [${className}Controller::class, 'withTrashed']);
        Route::get('${routeName}/only-trashed', [${className}Controller::class, 'onlyTrashed']);
        Route::get('${routeName}/without-trashed', [${className}Controller::class, 'withoutTrashed']);
        Route::post('${routeName}/update-or-create', [${className}Controller::class, 'updateOrCreate']);
        Route::post('${routeName}/batch-update', [${className}Controller::class, 'batchUpdate']);
        Route::post('${routeName}/first-or-create', [${className}Controller::class, 'firstOrCreate']);
        Route::post('${routeName}/first-or-new', [${className}Controller::class, 'firstOrNew']);
        Route::post('${routeName}/pluck', [${className}Controller::class, 'pluck']);
        Route::post('${routeName}/where-in', [${className}Controller::class, 'whereIn']);
        Route::post('${routeName}/where-not-in', [${className}Controller::class, 'whereNotIn']);
        Route::post('${routeName}/where-between', [${className}Controller::class, 'whereBetween']);
        Route::post('${routeName}/order-by', [${className}Controller::class, 'orderBy']);
        Route::post('${routeName}/group-by', [${className}Controller::class, 'groupBy']);
      `;

      return `
        // Custom routes for ${className}${customRoutesForController}
        // Resource routes for ${className}
        Route::resource('${routeName}', ${className}Controller::class);`;
    })
    .join('\n');

  const routes = `${routesWithComment}\n${useStatements}\nRoute::middleware('api')->group(function () {\n${customRoutes}\n});\n`;

  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, routes);
};

export default createAPIRoutes;
