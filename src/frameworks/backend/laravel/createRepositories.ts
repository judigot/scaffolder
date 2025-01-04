import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { generateModelImports } from '@/utils/common.ts';
import { APP_SETTINGS } from '@/constants.ts';
import { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';

const template = `
<?php

namespace App\\Repositories;

{{modelImports}}
use Illuminate\\Support\\Collection;
use App\\Models\\{{className}};
use App\\Repositories\\BaseRepository;

class {{className}}Repository extends BaseRepository implements {{className}}Interface
{
    public function __construct({{className}} $model)
    {
        parent::__construct($model);
    }
{{modelSpecificMethods}}
}
`;

const createRepositories = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      // Generate methods and contents for each relationship
      const { hasOne, hasMany, pivotRelationships, belongsTo } = tableInfo;
      const allMethods: string[] = [];

      // Helper function to generate paired method and content
      const generateRepositoryCode = (
        table: string,
        type: RelationshipTypes,
      ) => {
        const method = generateDomainCode({
          tableInfo,
          tableName,
          codeToGenerate: 'repositoryMethod',
          relationshipType: type,
          relatedTable: table,
        });

        const content = generateDomainCode({
          tableInfo,
          tableName,
          codeToGenerate: 'repositoryContent',
          relationshipType: type,
          relatedTable: table,
        });

        if (method && content) {
          allMethods.push(`${method}${content}`);
        }
      };

      // Generate for each relationship type
      hasOne.forEach((table) => {
        generateRepositoryCode(table, 'oneToOne');
      });

      hasMany.forEach((table) => {
        generateRepositoryCode(table, 'oneToMany');
      });

      belongsTo.forEach((table) => {
        generateRepositoryCode(table, 'belongsTo');
      });

      pivotRelationships.forEach(({ relatedTable }) => {
        generateRepositoryCode(relatedTable, 'manyToMany');
      });

      const modelSpecificMethods = allMethods.join('\n\n');
      const modelImports = generateModelImports(tableInfo);

      const replacements = {
        className,
        tableName,
        modelImports,
        modelSpecificMethods,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${className}Repository.php`,
        content,
      };
    });
};

export default createRepositories;
