import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/common';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { IFile } from '@/components/FileViewer';

// Helper function to replace placeholders in the template
const createFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

// Function to create interfaces based on schema information and return an array of IFile
const createInterfaces = (schemaInfo: ISchemaInfo[]): IFile[] => {
  const template = `<?php
${ownerComment}

namespace App\\Repositories;

use App\\Models\\{{modelName}};
{{modelImports}}
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

interface {{className}}Interface extends BaseInterface
{
{{modelSpecificMethods}}
}
`;

  const files: IFile[] = schemaInfo
    .filter(
      // Exclude pivot tables if specified in APP_SETTINGS
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { table } = tableInfo;
      const className = tableInfo.tableCases.pascalCase;

      if (!className) return null; // Skip if className is not found

      const modelImports = generateModelImports(tableInfo);
      const modelSpecificMethods = generateModelSpecificMethods({
        targetTable: table,
        schemaInfo,
        fileToGenerate: 'interface',
      });

      const replacements = {
        ownerComment,
        className,
        modelName: className,
        tableName: table,
        modelSpecificMethods,
        modelImports,
      };

      const content = createFile(template, replacements);

      return {
        type: 'file',
        name: `${className}Interface.php`,
        content,
      };
    })
    .filter((file): file is IFile => file !== null); // Filter out null values

  return files;
};

export default createInterfaces;
