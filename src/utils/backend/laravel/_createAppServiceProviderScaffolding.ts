import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';

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
  recreateFile,
}: {
  schemaInfo: ISchemaInfo[];
  recreateFile: boolean;
}): string => {
  let content = '';

  if (recreateFile) {
    content = `<?php
${ownerComment}

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
  }

  const importStatements = schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map(({ tableCases: { pascalCase } }) => {
      const className = pascalCase;
      return `use App\\Repositories\\${className}Repository;\nuse App\\Repositories\\${className}Interface;`;
    })
    .filter(Boolean)
    .join('\n');

  const bindStatements = schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map(({ tableCases: { pascalCase } }) => {
      const className = pascalCase;
      return `$this->app->bind(${className}Interface::class, ${className}Repository::class);`;
    })
    .filter(Boolean)
    .join('\n        ');

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

  return content;
};

export default createAppServiceProviderScaffolding;
