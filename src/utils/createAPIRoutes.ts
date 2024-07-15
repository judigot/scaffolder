import fs from 'fs';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { toPascalCase } from '@/helpers/toPascalCase';

const getOwnerComment = (extension: string): string => {
  const comments: Record<string, string> = {
    '.php': '/* Owner: App Scaffolder */\n',
  };
  return comments[extension] || '/* Owner: App Scaffolder */\n';
};

const createAPIRoutes = (
  tables: IRelationshipInfo[],
  outputFilePath: string,
): void => {
  let routes = `<?php\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n`;

  tables.forEach(({ table }) => {
    const className = toPascalCase(table);
    routes += `use App\\Http\\Controllers\\${className}Controller;\n`;
  });

  routes += `\nRoute::middleware('api')->group(function () {\n`;

  tables.forEach(({ table }) => {
    const routeName = table.endsWith('s') ? table : `${table}s`; // Ensure plural routes
    const className = toPascalCase(table);
    routes += `    Route::resource('${routeName}', ${className}Controller::class);\n`;
  });

  routes += `});\n`;

  const ownerComment = getOwnerComment('.php');
  const routesWithComment = routes.replace('<?php', `<?php\n${ownerComment}`);

  fs.writeFileSync(outputFilePath, routesWithComment);
};

export default createAPIRoutes;
