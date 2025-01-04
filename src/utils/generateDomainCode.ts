import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import domainStructure from '@/frameworks/backend/laravel/domain-methods/DomainMethods.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';
import { TableReplacements } from '@/interfaces/placeholders.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';

function generateDomainCode({
  tableInfo,
  tableName,
  codeToGenerate,
  relationshipType,
  relatedTable,
}: {
  tableInfo: ISchemaInfo;
  tableName: ISchemaInfo['tableName'];
  codeToGenerate: keyof IMethods;
  relationshipType?: RelationshipTypes;
  relatedTable?: string;
}): string {
  const determineRelationshipType = ({
    relationshipType,
    tableInfo,
    relatedTable,
  }: {
    relationshipType: RelationshipTypes;
    tableInfo: ISchemaInfo;
    relatedTable: string;
  }): {
    belongsTo: boolean;
    hasOne: boolean;
    hasMany: boolean;
    pivotRelationships: boolean;
    isOneToOne: boolean;
    isOneToMany: boolean;
    isManyToMany: boolean;
    isBelongsTo: boolean;
    isPivot: boolean;
  } => {
    const hasOne = tableInfo.hasOne.includes(relatedTable);
    const hasMany = tableInfo.hasMany.includes(relatedTable);
    const belongsTo = tableInfo.belongsTo.includes(relatedTable);
    const isPivotRelationship = tableInfo.pivotRelationships.some(
      (rel) => rel.relatedTable === relatedTable,
    );

    return {
      belongsTo,
      hasOne,
      hasMany,
      pivotRelationships: isPivotRelationship,
      isOneToOne: relationshipType === 'oneToOne',
      isOneToMany: relationshipType === 'oneToMany',
      isManyToMany: relationshipType === 'manyToMany',
      isBelongsTo: relationshipType === 'belongsTo',
      isPivot: isPivotRelationship,
    };
  };
  const primaryKey = tableInfo.columnsInfo.find(
    (column) => column.primary_key,
  )?.column_name;

  if (primaryKey == null) {
    throw new Error(`Primary key not found for table "${tableName}".`);
  }

  const {
    hasOne,
    hasMany,
    pivotRelationships,
    isPivot,
    belongsTo,
    belongsToMany,
  } = tableInfo;

  // Track generated methods to prevent duplicates
  const generatedMethods = new Set<string>();

  const generateCodeFromTable = (
    relatedTable: string,
    relationshipType: RelationshipTypes,
  ): string => {
    const pivotTableName = tableInfo.pivotRelationships.find(
      (rel) => rel.relatedTable === relatedTable,
    )?.pivotTable;

    const rawMethods = domainStructure.methods;

    const status = determineRelationshipType({
      relationshipType,
      tableInfo,
      relatedTable,
    });

    const {
      singular: tableNameSingular,
      pascalCase: tableNamePascalCase,
      kebabCase: tableNameKebab,
      kebabCasePlural: tableNameKebabCasePlural,
    } = changeCase(tableName);

    const {
      plural: relatedTableNamePlural,
      pascalCase: relatedTableNamePascal,
      pascalCasePlural: relatedTableNamePascalPlural,
      kebabCase: relatedTableNameKebabCase,
      kebabCasePlural: relatedTableNameKebabCasePlural,
    } = changeCase(relatedTable);

    const {
      pascalCase: pivotTableNamePascal,
      kebabCase: pivotTableNameKebabCase,
    } =
      pivotTableName != null
        ? changeCase(pivotTableName)
        : { pascalCase: '', kebabCase: '' };

    const placeholders: TableReplacements = {
      tableNameSingular,
      tableNamePascalCase,
      tableNameKebabCase: tableNameKebab,
      tableNameKebabCasePlural,
    };

    const updatedPlaceholders = {
      relatedTableName: relatedTable,
      relatedTableNameKebabCase,
      relatedTableNamePascal,
      relatedTableNamePlural,
      relatedTableNamePascalPlural,
      relatedTableNameKebabCasePlural,
      primaryKey,
      ...(relationshipType === 'manyToMany' && {
        pivotTableName: pivotTableName ?? '',
        pivotTableNamePascal,
        pivotTableNameKebabCase,
      }),
    };

    let template = rawMethods
      .map((method) => {
        const templateVal = method[codeToGenerate];
        const methodNameVal = method.methodName(status);
        const repositoryMethodVal =
          typeof method.repositoryMethod === 'function'
            ? method.repositoryMethod(status)
            : '';

        let tempTemplate = '';

        if (typeof templateVal === 'function') {
          tempTemplate = templateVal({
            ...status,
            isPivot,
          });
        }

        if (typeof templateVal === 'string') {
          tempTemplate = templateVal;
        }

        return replacePlaceholder({
          template: tempTemplate,
          replacements: {
            methodName: methodNameVal,
            repositoryMethod: (() => {
              return replacePlaceholder({
                template: repositoryMethodVal,
                replacements: {
                  methodName: methodNameVal,
                },
              });
            })(),
          },
        });
      })
      .join(codeToGenerate === 'repositoryMethod' ? ';\n' : '');

    if (codeToGenerate === 'repositoryMethod') {
      template = `${template};`;
    }

    const result = replacePlaceholder({
      template,
      replacements: { ...placeholders, ...updatedPlaceholders },
    });

    // Extract method name from the result to track duplicates
    const methodNameMatch = /public function (\w+)/.exec(result);
    if (methodNameMatch?.[1] != null && methodNameMatch[1].length > 0) {
      const methodName = methodNameMatch[1];
      if (generatedMethods.has(methodName)) {
        return ''; // Skip duplicate method
      }
      generatedMethods.add(methodName);
    }

    return result;
  };

  // If relationshipType and relatedTable are provided, generate for specific relationship
  if (
    relationshipType != null &&
    relatedTable != null &&
    relatedTable.length > 0
  ) {
    return generateCodeFromTable(relatedTable, relationshipType);
  }

  // Generate methods for each relationship type
  const allMethods: string[] = [
    ...hasOne.map((table) => generateCodeFromTable(table, 'oneToOne')),

    ...hasMany.map((table) => generateCodeFromTable(table, 'oneToMany')),

    ...belongsTo.map((table) => generateCodeFromTable(table, 'belongsTo')),

    ...belongsToMany.map((table) =>
      generateCodeFromTable(table, 'belongsToMany'),
    ),

    ...pivotRelationships.map(({ relatedTable }) =>
      generateCodeFromTable(relatedTable, 'manyToMany'),
    ),
  ];

  return allMethods.filter(Boolean).join('\n');
}

export default generateDomainCode;
