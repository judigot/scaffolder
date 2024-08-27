import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';

const updateOrCreateSection = (
  content: string,
  startMarker: string,
  endMarker: string,
  newContent: string,
): string => {
  const startId = content.indexOf(startMarker);
  const endId = content.indexOf(endMarker);

  if (startId !== -1 && endId !== -1) {
    return (
      content.slice(0, startId + startMarker.length) +
      '\n' +
      newContent +
      '\n' +
      content.slice(endId)
    );
  }

  return content + '\n\n' + startMarker + '\n' + newContent + '\n' + endMarker;
};

const createAppServiceProviderScaffolding = ({
  schemaInfo,
  outputDir,
  recreateFile,
}: {
  schemaInfo: ISchemaInfo[];
  outputDir: string;
  recreateFile: boolean;
}): void => {
  const filePath = path.join(outputDir, 'AppServiceProvider.php');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let content = '';

  if (recreateFile || !fs.existsSync(filePath)) {
    content = `<?php

namespace App\\Providers;

use Illuminate\\Support\\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind start
        // Bind end
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}`;
  } else {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  const importStatements = schemaInfo
    .map(({ table, isPivot }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

      const className = toPascalCase(table);
      return `use App\\Repositories\\${className}Repository;\nuse App\\Repositories\\${className}Interface;`;
    })
    .join('\n');

  const bindStatements = schemaInfo
    .map(({ table, isPivot }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

      const className = toPascalCase(table);
      return `$this->app->bind(${className}Interface::class, ${className}Repository::class);`;
    })
    .join('\n        ');

  // Ensure that Import section exists
  if (!content.includes('// Import start')) {
    const importSection = `// Import start\n${importStatements}\n// Import end`;
    const serviceProviderId = content.indexOf('class AppServiceProvider');
    content =
      content.slice(0, serviceProviderId) +
      importSection +
      '\n\n' +
      content.slice(serviceProviderId);
  } else {
    content = updateOrCreateSection(
      content,
      '// Import start',
      '// Import end',
      importStatements,
    );
  }

  // Ensure that Bind section exists
  if (!content.includes('// Bind start')) {
    const bindSection = `// Bind start\n        ${bindStatements}\n        // Bind end`;
    const registerId = content.indexOf('register(): void');
    const registerCloseId = content.indexOf('}', registerId);
    content =
      content.slice(0, registerCloseId) +
      bindSection +
      '\n' +
      content.slice(registerCloseId);
  } else {
    content = updateOrCreateSection(
      content,
      '// Bind start',
      '// Bind end',
      bindStatements,
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
};

export default createAppServiceProviderScaffolding;
