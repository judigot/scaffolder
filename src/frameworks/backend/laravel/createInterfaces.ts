import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelImports } from '@/utils/common.ts';
import { APP_SETTINGS } from '@/constants.ts';
import { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';

const template = `
<?php

namespace App\\Repositories;

{{modelImports}}
use App\\Models\\{{tableNamePascalCase}};
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

interface {{tableNamePascalCase}}Interface extends BaseInterface
{
{{modelSpecificMethods}}
}
`;

const createInterfaceMethods = ({
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

  // Helper function to generate interface methods
  const generateInterfaceCode = (table: string, type: RelationshipTypes) => {
    const method = generateDomainCode({
      schemaInfo,
      tableName,
      codeToGenerate: 'repositoryMethod',
      relationshipType: type,
      relatedTable: table,
    });

    if (method) {
      // Remove the function body and add semicolon for interface
      const interfaceMethod = method.replace(/\s*\{[\s\S]*\}\s*$/, ';').trim();
      allMethods.push(`    ${interfaceMethod};`);
    }
  };

  // Generate for each relationship type
  hasOne.forEach((table) => {
    generateInterfaceCode(table, 'oneToOne');
  });

  hasMany.forEach((table) => {
    generateInterfaceCode(table, 'oneToMany');
  });

  belongsTo.forEach((table) => {
    generateInterfaceCode(table, 'belongsTo');
  });

  pivotRelationships.forEach(({ relatedTable }) => {
    generateInterfaceCode(relatedTable, 'manyToMany');
  });

  return allMethods.join('\n\n');
};

const createInterfaces = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase: tableNamePascalCase } = changeCase(tableName);

      const modelImports = generateModelImports(tableInfo);
      const modelSpecificMethods = createInterfaceMethods({
        tableName,
        schemaInfo,
        tableInfo,
      });

      const replacements = {
        tableNamePascalCase,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${tableNamePascalCase}Interface.php`,
        content,
      };
    });
};

export default createInterfaces;
