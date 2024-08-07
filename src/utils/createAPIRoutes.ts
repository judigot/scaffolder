import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

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

  const routeGroups = schemaInfo
    .map(({ table }) => {
      const routeName = table.endsWith('s') ? table : `${table}s`; // Ensure plural routes
      const className = toPascalCase(table);
      return `    Route::resource('${routeName}', ${className}Controller::class);`;
    })
    .join('\n');

  const routes = `${routesWithComment}\n${useStatements}\nRoute::middleware('api')->group(function () {\n${routeGroups}\n});\n`;

  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, routes);
};

export default createAPIRoutes;
