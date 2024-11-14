import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/common';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { IFile } from '@/components/FileViewer';

const createRepositories = (schemaInfo: ISchemaInfo[]): IFile[] => {
  const repositories: IFile[] = [];

  schemaInfo.forEach((tableInfo) => {
    const {
      table,
      tableCases: { pascalCase },
      isPivot,
    } = tableInfo;

    // Skip generation for pivot tables if specified in settings
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const modelSpecificMethods = generateModelSpecificMethods({
      targetTable: table,
      schemaInfo,
      fileToGenerate: 'repository',
    });
    const modelImports = generateModelImports(tableInfo);

    const template = `<?php
${ownerComment}
namespace App\\Repositories;

${modelImports}

class ${pascalCase}Repository
{
    ${modelSpecificMethods}
}`;

    repositories.push({
      type: 'file',
      name: `${pascalCase}Repository.php`,
      content: template,
    });
  });

  return repositories;
};

export default createRepositories;
