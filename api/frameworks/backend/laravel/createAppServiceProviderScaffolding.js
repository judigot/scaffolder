import { APP_SETTINGS } from '../../../constants';
import { createFile } from '../../../helpers/stringHelper';
import { changeCase } from '../../../utils/common';
const updateOrCreateSection = (content, startMarker, endMarker, newContent) => {
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
const createAppServiceProviderScaffolding = ({ schemaInfo }) => {
  let template = '';
  template = `
<?php

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
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map(({ tableName }) => {
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;
      return `use App\\Repositories\\${className}Repository;\nuse App\\Repositories\\${className}Interface;`;
    })
    .filter(Boolean)
    .join('\n');
  const bindStatements = schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map(({ tableName }) => {
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;
      return `$this->app->bind(${className}Interface::class, ${className}Repository::class);`;
    })
    .filter(Boolean)
    .join('\n        ');
  if (!template.includes('// Import start')) {
    const importSection = `// Import start\n${importStatements}\n// Import end`;
    const serviceProviderId = template.indexOf('class AppServiceProvider');
    template =
      template.slice(0, serviceProviderId) +
      importSection +
      '\n\n' +
      template.slice(serviceProviderId);
  } else {
    template = updateOrCreateSection(
      template,
      '// Import start',
      '// Import end',
      importStatements,
    );
  }
  if (!template.includes('// Bind start')) {
    const bindSection = `// Bind start\n        ${bindStatements}\n        // Bind end`;
    const registerId = template.indexOf('register(): void');
    const registerCloseId = template.indexOf('}', registerId);
    template =
      template.slice(0, registerCloseId) +
      bindSection +
      '\n' +
      template.slice(registerCloseId);
  } else {
    template = updateOrCreateSection(
      template,
      '// Bind start',
      '// Bind end',
      bindStatements,
    );
  }
  const replacements = {};
  const content = createFile({ template, replacements });
  return {
    type: 'file',
    name: 'AppServiceProvider.php',
    content,
  };
};
export default createAppServiceProviderScaffolding;
