import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import hasOneStructure from '@/frameworks/backend/laravel/relationship-methods/hasOneStructure.ts';
import { ITableInfo } from '@/interfaces/interfaces.ts';
import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';

function generateDomainCode({
  tableInfo: { hasOne, hasMany, pivotRelationships },
  placeholders,
  codeToGenerate,
}: {
  tableInfo: ITableInfo;
  placeholders: Record<string, string>;
  codeToGenerate: keyof IMethods;
}): string {
  const template = `// ${hasOneStructure.description}\n${hasOneStructure[codeToGenerate]}`;

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
