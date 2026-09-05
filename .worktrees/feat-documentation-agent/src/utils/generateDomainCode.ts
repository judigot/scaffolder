import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import domainStructure from '@/frameworks/backend/laravel/domain-methods/DomainMethods.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import type { TableReplacements } from '@/interfaces/placeholders.ts';
import type { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';
import type { IDomainStatus } from '@/interfaces/IDomainStatus.ts';

interface IGeneratedMethod {
  methodName: string;
  code: string;
  relationshipType: RelationshipTypes;
  relatedTable: string;
}

function generateDomainCode({
  schemaInfo,
  tableInfo,
  tableName,
  codeToGenerate,
  relationshipType,
}: {
  schemaInfo: ISchemaInfo[];
  tableInfo: ISchemaInfo;
  tableName: ISchemaInfo['tableName'];
  codeToGenerate: keyof IMethod;
  relationshipType?: RelationshipTypes;
}): string[] {
  const determineRelationshipType = ({
    relationshipType,
    tableInfo,
    relatedTable,
  }: {
    relationshipType: RelationshipTypes;
    tableInfo: ISchemaInfo;
    relatedTable: string;
  }): IDomainStatus => {
    const hasOne = tableInfo.hasOne?.includes(relatedTable) ?? false;
    const hasMany = tableInfo.hasMany?.includes(relatedTable) ?? false;
    const belongsTo = tableInfo.belongsTo?.includes(relatedTable) ?? false;
    const isPivotRelationship = tableInfo.pivotRelationships?.some(
      (rel) => rel.relatedTable === relatedTable,
    );

    // Find the related table's schema info
    const relatedTableInfo = schemaInfo.find(
      (table) => table.tableName === relatedTable,
    );

    // Check if the current table exists in the related table's relationships
    const isInRelatedTableHasOne =
      relatedTableInfo?.hasOne?.includes(tableName) ?? false;
    const isInRelatedTableHasMany =
      relatedTableInfo?.hasMany?.includes(tableName) ?? false;
    const isInRelatedTableBelongsTo =
      relatedTableInfo?.belongsTo?.includes(tableName) ?? false;
    const isInRelatedTablePivot =
      relatedTableInfo?.pivotRelationships?.some(
        (rel) => rel.relatedTable === tableName,
      ) ?? false;

    return {
      belongsTo,
      hasOne,
      hasMany,
      pivotRelationships: isPivotRelationship ?? false,
      isOneToOne:
        hasOne ||
        isInRelatedTableHasOne ||
        (relationshipType === 'oneToOne' &&
          (belongsTo || isInRelatedTableBelongsTo)),
      isOneToMany:
        (hasMany && isInRelatedTableBelongsTo) ||
        (belongsTo && isInRelatedTableHasMany),
      isManyToMany: (isPivotRelationship ?? false) && isInRelatedTablePivot,
      isBelongsTo: relationshipType === 'belongsTo',
      isBelongsToMany: relationshipType === 'belongsToMany',
      isPivot: isPivotRelationship ?? false,
    };
  };

  const primaryKey = tableInfo.columnsInfo.find(
    (column) => column.primary_key ?? false,
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
  ): IGeneratedMethod[] => {
    // Find pivot table by checking which table has both foreign keys
    const pivotTableName =
      relationshipType === 'belongsToMany' || relationshipType === 'manyToMany'
        ? schemaInfo.find((table) => {
            if (table.foreignTables === undefined) {
              return false;
            }
            return (
              table.foreignTables.includes(relatedTable) &&
              table.foreignTables.includes(tableName)
            );
          })?.tableName
        : tableInfo.pivotRelationships?.find(
            (rel) => rel.relatedTable === relatedTable,
          )?.pivotTable;

    const relatedTableForeignKey = schemaInfo
      .find((table) => table.tableName === relatedTable)
      ?.columnsInfo.find((column) => Boolean(column.primary_key))?.column_name;

    if (relatedTableForeignKey == null) {
      throw new Error(
        `ForeignKey not found for table "${tableName}" and related table "${relatedTable}".`,
      );
    }

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
      pivotTableName !== undefined
        ? changeCase(pivotTableName)
        : { pascalCase: '', kebabCase: '' };

    const placeholders: TableReplacements = {
      tableNameSingular,
      tableNamePascalCase,
      tableNameKebabCase: tableNameKebab,
      tableNameKebabCasePlural,
    };

    const hasPivotRelationships =
      pivotRelationships && pivotRelationships.length > 0;

    const updatedPlaceholders = {
      relatedTableForeignKey,
      relatedTableName: relatedTable,
      relatedTableNameKebabCase,
      relatedTableNamePascal,
      relatedTableNamePlural,
      relatedTableNamePascalPlural,
      relatedTableNameKebabCasePlural,
      primaryKey,
      ...((hasPivotRelationships ?? false) && {
        pivotTableName,
        pivotTableNamePascal,
        pivotTableNameKebabCase,
      }),
    };

    return rawMethods
      .map((method): IGeneratedMethod | null => {
        const templateVal = method[codeToGenerate];
        const repositoryMethodName = method.methodName(status);
        const modelMethodName = method.modelMethod(status);

        const repositoryMethod =
          typeof method.repositoryMethod === 'function'
            ? method.repositoryMethod(status)
            : method.repositoryMethod;

        const controllerMethodName =
          typeof method.controllerMethod === 'function'
            ? method.controllerMethod(status)
            : method.controllerMethod;

        let tempTemplate = '';

        if (typeof templateVal === 'function') {
          tempTemplate = templateVal({
            ...status,
            isPivot: isPivot ?? false,
          });
        }

        if (typeof templateVal === 'string') {
          tempTemplate = templateVal;
        }

        if (tempTemplate === '') {
          return null;
        }

        const finalTemplate = replacePlaceholder({
          template: tempTemplate,
          replacements: {
            methodName: repositoryMethodName,
            modelMethod: modelMethodName,
            controllerMethod: replacePlaceholder({
              template: controllerMethodName,
              replacements: {
                methodName: repositoryMethodName,
              },
            }),
            repositoryMethod: replacePlaceholder({
              template: repositoryMethod,
              replacements: {
                methodName: repositoryMethodName,
              },
            }),
          },
        });

        const result = replacePlaceholder({
          template: finalTemplate,
          replacements: { ...placeholders, ...updatedPlaceholders },
        });

        // Extract method name from the result to track duplicates
        const methodNameMatch = /public function (\w+)/.exec(result);
        if (methodNameMatch?.[1] != null && methodNameMatch[1].length > 0) {
          const methodName = methodNameMatch[1];
          if (generatedMethods.has(methodName)) {
            return null;
          }
          generatedMethods.add(methodName);
        }

        return {
          methodName: repositoryMethodName,
          code: result,
          relationshipType,
          relatedTable,
        };
      })
      .filter((method): method is IGeneratedMethod => method !== null);
  };

  // Generate all methods
  const allMethods = [
    ...(hasOne ?? []).flatMap((table) =>
      generateCodeFromTable(table, 'oneToOne'),
    ),
    ...(hasMany ?? []).flatMap((table) =>
      generateCodeFromTable(table, 'oneToMany'),
    ),
    ...(belongsTo ?? []).flatMap((table) =>
      generateCodeFromTable(table, 'belongsTo'),
    ),
    ...(belongsToMany ?? []).flatMap((table) =>
      generateCodeFromTable(table, 'belongsToMany'),
    ),
    ...(pivotRelationships ?? []).flatMap(({ relatedTable }) =>
      generateCodeFromTable(relatedTable, 'manyToMany'),
    ),
  ];

  // If specific relationship is requested, filter for that
  if (relationshipType != null) {
    return allMethods
      .filter((method) => method.relationshipType === relationshipType)
      .map((method) => method.code);
  }

  // Return all methods sorted by relationship type
  return allMethods.map((method) => method.code);
}

export default generateDomainCode;
