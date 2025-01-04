import { replacePlaceholder } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';
import domainStructure from '@/frameworks/backend/laravel/domain-methods/DomainMethods.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';
import { TableReplacements } from '@/interfaces/placeholders.ts';
import { RelationshipTypes } from '@/interfaces/IRelationshipTypes.ts';

interface IGeneratedMethod {
  methodName: string;
  code: string;
  relationshipType: RelationshipTypes;
  relatedTable: string;
}

function generateDomainCode({
  _schemaInfo,
  tableInfo,
  tableName,
  codeToGenerate,
  relationshipType,
  relatedTable,
}: {
  schemaInfo: ISchemaInfo[];
  tableInfo: ISchemaInfo;
  tableName: ISchemaInfo['tableName'];
  codeToGenerate: keyof IMethods;
  relationshipType?: RelationshipTypes;
  relatedTable?: string;
}): string[] {
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
    // One to one relationship schemaInfo = [ { tableName: 'user', requiredColumns: [ 'user_id', 'first_name', 'last_name', 'email', 'username', 'password', 'created_at', 'updated_at', ], columnsInfo: [ { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'first_name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'last_name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'email', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: true, foreign_key: null, }, { column_name: 'username', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: true, foreign_key: null, }, { column_name: 'password', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'created_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'updated_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: [], foreignKeys: [], isPivot: false, childTables: ['post'], hasOne: ['post'], hasMany: [], belongsTo: [], belongsToMany: [], pivotRelationships: [], }, { tableName: 'post', requiredColumns: [ 'post_id', 'user_id', 'title', 'created_at', 'updated_at', ], columnsInfo: [ { column_name: 'post_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', column_default: null, primary_key: false, unique: true, foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id', }, }, { column_name: 'title', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'content', data_type: 'string', is_nullable: 'YES', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'created_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'updated_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: ['user'], foreignKeys: ['user_id'], isPivot: false, childTables: [], hasOne: [], hasMany: [], belongsTo: ['user'], belongsToMany: [], pivotRelationships: [], }, ]
    // 
    
    // One to many relationship schemaInfo = [ { tableName: 'user', requiredColumns: [ 'user_id', 'first_name', 'last_name', 'email', 'username', 'password', 'created_at', 'updated_at', ], columnsInfo: [ { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'first_name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'last_name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'email', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: true, foreign_key: null, }, { column_name: 'username', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: true, foreign_key: null, }, { column_name: 'password', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'created_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'updated_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: [], foreignKeys: [], isPivot: false, childTables: ['post'], hasOne: [], hasMany: ['post'], belongsTo: [], belongsToMany: [], pivotRelationships: [], }, { tableName: 'post', requiredColumns: [ 'post_id', 'user_id', 'title', 'created_at', 'updated_at', ], columnsInfo: [ { column_name: 'post_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'user_id', data_type: 'number', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: { foreign_table_name: 'user', foreign_column_name: 'user_id', }, }, { column_name: 'title', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'content', data_type: 'string', is_nullable: 'YES', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'created_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, { column_name: 'updated_at', data_type: 'Date', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: ['user'], foreignKeys: ['user_id'], isPivot: false, childTables: [], hasOne: [], hasMany: [], belongsTo: ['user'], belongsToMany: [], pivotRelationships: [], }, ]
    // Many to many relationship schemaInfo = [ { tableName: 'product', requiredColumns: ['product_id', 'product_name'], columnsInfo: [ { column_name: 'product_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'product_name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: [], foreignKeys: [], isPivot: false, childTables: ['order_product'], hasOne: [], hasMany: ['order_product'], belongsTo: [], belongsToMany: ['order'], pivotRelationships: [ { relatedTable: 'order', pivotTable: 'order_product', }, ], }, { tableName: 'customer', requiredColumns: ['customer_id', 'name'], columnsInfo: [ { column_name: 'customer_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'name', data_type: 'string', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: null, }, ], foreignTables: [], foreignKeys: [], isPivot: false, childTables: ['order'], hasOne: [], hasMany: ['order'], belongsTo: [], belongsToMany: [], pivotRelationships: [], }, { tableName: 'order', requiredColumns: ['order_id', 'customer_id'], columnsInfo: [ { column_name: 'order_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'customer_id', data_type: 'number', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: { foreign_table_name: 'customer', foreign_column_name: 'customer_id', }, }, ], foreignTables: ['customer'], foreignKeys: ['customer_id'], isPivot: false, childTables: ['order_product'], hasOne: [], hasMany: ['order_product'], belongsTo: ['customer'], belongsToMany: ['product'], pivotRelationships: [ { relatedTable: 'product', pivotTable: 'order_product', }, ], }, { tableName: 'order_product', requiredColumns: ['order_product_id', 'order_id', 'product_id'], columnsInfo: [ { column_name: 'order_product_id', data_type: 'number', is_nullable: 'NO', column_default: 'AUTO_INCREMENT', primary_key: true, unique: false, foreign_key: null, }, { column_name: 'order_id', data_type: 'number', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: { foreign_table_name: 'order', foreign_column_name: 'order_id', }, }, { column_name: 'product_id', data_type: 'number', is_nullable: 'NO', column_default: null, primary_key: false, unique: false, foreign_key: { foreign_table_name: 'product', foreign_column_name: 'product_id', }, }, ], foreignTables: ['order', 'product'], foreignKeys: ['order_id', 'product_id'], isPivot: true, childTables: [], hasOne: [], hasMany: [], belongsTo: ['order', 'product'], belongsToMany: [], pivotRelationships: [], }, ]
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
  ): IGeneratedMethod[] => {
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

    return rawMethods
      .map((method): IGeneratedMethod | null => {
        const templateVal = method[codeToGenerate];
        const repositoryMethodName = method.methodName(status);

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
            isPivot,
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
    ...hasOne.flatMap((table) => generateCodeFromTable(table, 'oneToOne')),
    ...hasMany.flatMap((table) => generateCodeFromTable(table, 'oneToMany')),
    ...belongsTo.flatMap((table) => generateCodeFromTable(table, 'belongsTo')),
    ...belongsToMany.flatMap((table) =>
      generateCodeFromTable(table, 'belongsToMany'),
    ),
    ...pivotRelationships.flatMap(({ relatedTable }) =>
      generateCodeFromTable(relatedTable, 'manyToMany'),
    ),
  ];

  // If specific relationship is requested, filter for that
  if (
    relationshipType != null &&
    relatedTable != null &&
    relatedTable.length > 0
  ) {
    return allMethods
      .filter(
        (method) =>
          method.relationshipType === relationshipType &&
          method.relatedTable === relatedTable,
      )
      .map((method) => method.code);
  }

  // Return all methods sorted by relationship type
  return allMethods.map((method) => method.code);
}

export default generateDomainCode;
