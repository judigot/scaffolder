import { IFile } from '@/components/FileViewer.tsx';
import { APP_SETTINGS } from '@/constants.ts';
import { createFile } from '@/helpers/stringHelper.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';

const template = `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\{{tableNamePascalCase}};
use App\\Repositories\\{{tableNamePascalCase}}Interface;
use App\\Services\\{{tableNamePascalCase}}Service;
use Illuminate\\Http\\Request;
use App\\Http\\Controllers\\BaseController;

class {{tableNamePascalCase}}Controller extends BaseController
{
    protected $repository;

    public function __construct({{tableNamePascalCase}}Interface \${{tableName}}Repository, {{tableNamePascalCase}}Service \${{tableName}}Service)
    {
        parent::__construct(\${{tableName}}Service);
        $this->repository = \${{tableName}}Repository;
    }

{{controllerMethods}}
}
`;

const createControllerMethods = ({
  tableName,
  schemaInfo,
  tableInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
  tableInfo: ISchemaInfo;
}): string => {
  const { hasOne, hasMany, pivotRelationships, belongsTo } = tableInfo;
  const allMethods: string[] = [];

  // Helper function to generate paired method and content
  const generateControllerCode = (
    table: string,
    type: RelationshipTypes,
  ) => {
    const method = generateDomainCode({
      schemaInfo,
      tableName,
      codeToGenerate: 'controllerMethod',
      relationshipType: type,
      relatedTable: table,
    });

    const content = generateDomainCode({
      schemaInfo,
      tableName,
      codeToGenerate: 'controllerContent',
      relationshipType: type,
      relatedTable: table,
    });

    if (method && content) {
      allMethods.push(`    public function ${method}\n    {${content}\n    }`);
    }
  };

  // Generate for each relationship type
  hasOne.forEach((table) => {
    generateControllerCode(table, 'oneToOne');
  });

  hasMany.forEach((table) => {
    generateControllerCode(table, 'oneToMany');
  });

  belongsTo.forEach((table) => {
    generateControllerCode(table, 'belongsTo');
  });

  pivotRelationships.forEach(({ relatedTable }) => {
    generateControllerCode(relatedTable, 'manyToMany');
  });

  return allMethods.join('\n\n');
};

const createControllers = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);

      const controllerMethods = createControllerMethods({
        tableName,
        schemaInfo,
        tableInfo,
      });

      const replacements = {
        tableNamePascalCase,
        tableName,
        controllerMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${tableNamePascalCase}Controller.php`,
        content,
      };
    });
};

export default createControllers;
