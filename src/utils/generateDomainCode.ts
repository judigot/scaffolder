import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import { domainStructure } from '@/frameworks/backend/laravel/domain-methods/DomainMethods.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';
import { TableReplacements } from '@/interfaces/placeholders.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';

function generateDomainCode({
  schemaInfo,
  tableName,
  codeToGenerate,
  relationshipType,
  relatedTable,
}: {
  schemaInfo: ISchemaInfo[];
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
    };
  };
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

  const { hasOne, hasMany, pivotRelationships, isPivot, belongsTo } = tableInfo;

  // Track generated methods to prevent duplicates
  const generatedMethods = new Set<string>();

  const generateCodeFromTable = (
    relatedTable: string,
    relationshipType: RelationshipTypes,
  ): string => {
    const pivotTableName = tableInfo.pivotRelationships.find(
      (rel) => rel.relatedTable === relatedTable,
    )?.pivotTable;

    const structure = domainStructure({
      _tableInfo: tableInfo,
      _schemaInfo: schemaInfo,
    });
    const templateValue = structure[codeToGenerate];

    const status = determineRelationshipType({
      relationshipType,
      tableInfo,
      relatedTable,
    });

    const template =
      typeof templateValue === 'string'
        ? templateValue
        : templateValue({
            ...status,
            isPivot,
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
    // hasOne relationships
    ...hasOne.map((table) => generateCodeFromTable(table, 'oneToOne')),

    // hasMany relationships
    ...hasMany.map((table) => generateCodeFromTable(table, 'oneToMany')),

    // belongsTo relationships
    ...belongsTo.map((table) => generateCodeFromTable(table, 'belongsTo')),

    // pivotRelationships (many-to-many)
    ...pivotRelationships.map(({ relatedTable }) =>
      generateCodeFromTable(relatedTable, 'manyToMany'),
    ),
  ];

  return allMethods.filter(Boolean).join('\n');
}

export default generateDomainCode;
