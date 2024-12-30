import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import hasOneStructure from '@/frameworks/backend/laravel/relationship-methods/hasOneStructure.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';

function generateDomainCode({
  schemaInfo,
  tableName,
  placeholders,
  codeToGenerate,
}: {
  schemaInfo: ISchemaInfo[];
  tableName: ISchemaInfo['tableName'];
  placeholders: Record<string, string>;
  codeToGenerate: keyof IMethods;
}): string {
  const tableInfo = schemaInfo.find((table) => table.tableName === tableName);

  if (!tableInfo) {
    throw new Error(`Table "${tableName}" not found in schema information.`);
  }
  const primaryKey = tableInfo.columnsInfo.find(
    (column) => column.primary_key,
  )?.column_name;

  if (primaryKey == null) {
    throw new Error(`Primary key not found for table "${tableName}".`);
  }

  const { hasOne, hasMany, pivotRelationships } = tableInfo;
  const template = hasOneStructure[codeToGenerate];

  const generateRouteFromTable = (
    relatedTable: string,
    caseType: 'singular' | 'plural',
  ): string => {
    const {
      [caseType === 'singular' ? 'pascalCase' : 'pascalCasePlural']:
        relatedTableNamePascal,
      [caseType === 'singular' ? 'kebabCase' : 'kebabCasePlural']:
        relatedTableNameKebabCase,
    } = changeCase(relatedTable);

    const updatedPlaceholders = {
      ...placeholders,
      relatedTableNameKebabCase,
      relatedTableNamePascal,
      primaryKey,
    };

    return replacePlaceholder({
      template,
      replacements: updatedPlaceholders,
    });
  };

  const routes = [
    // One to One relationships
    ...hasOne.map((table) => generateRouteFromTable(table, 'singular')),

    // Has Many relationships
    ...hasMany.map((table) => {
      const pivotRelationship = pivotRelationships.find(
        (rel) => rel.pivotTable === table,
      );

      // One to Many
      if (!pivotRelationship) {
        return generateRouteFromTable(table, 'plural');
      }

      // Many to Many
      return generateRouteFromTable(pivotRelationship.relatedTable, 'plural');
    }),
  ];

  return routes.filter(Boolean).join('\n');
}

export default generateDomainCode;
