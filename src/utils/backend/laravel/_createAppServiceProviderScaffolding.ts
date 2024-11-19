import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { createFile } from '@/helpers/stringHelper';
import { IFile } from '@/components/FileViewer';

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
}: {
  schemaInfo: ISchemaInfo[];
}): IFile => {
  let TEMPLATE = '';

  TEMPLATE = `<?php
{{ownerComment}}

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
}
`;

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

  if (!TEMPLATE.includes('// Import start')) {
    const importSection = `// Import start\n${importStatements}\n// Import end`;
    const serviceProviderId = TEMPLATE.indexOf('class AppServiceProvider');
    TEMPLATE =
      TEMPLATE.slice(0, serviceProviderId) +
      importSection +
      '\n\n' +
      TEMPLATE.slice(serviceProviderId);
  } else {
    TEMPLATE = updateOrCreateSection(
      TEMPLATE,
      '// Import start',
      '// Import end',
      importStatements,
    );
  }

  if (!TEMPLATE.includes('// Bind start')) {
    const bindSection = `// Bind start\n        ${bindStatements}\n        // Bind end`;
    const registerId = TEMPLATE.indexOf('register(): void');
    const registerCloseId = TEMPLATE.indexOf('}', registerId);
    TEMPLATE =
      TEMPLATE.slice(0, registerCloseId) +
      bindSection +
      '\n' +
      TEMPLATE.slice(registerCloseId);
  } else {
    TEMPLATE = updateOrCreateSection(
      TEMPLATE,
      '// Bind start',
      '// Bind end',
      bindStatements,
    );
  }

  const replacements = {
    ownerComment,
  };

  const content = createFile(TEMPLATE, replacements);

  return {
    type: 'file',
    name: 'AppServiceProvider.php',
    content,
  };
};

export default createAppServiceProviderScaffolding;
