import { describe, expect, test } from 'vitest';
import renameTable from '@/utils/renameTable.ts';
import manyToManySchema from '@/schema-infos/manyToMany.ts';
import oneToOneSchema from '@/schema-infos/oneToOne.ts';
import oneToManySchema from '@/schema-infos/oneToMany.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('renameTable', () => {
  test('should rename order table to orderz and update all related references', () => {
    const result = renameTable({
      oldTableName: 'order',
      newTableName: 'orderz',
      schemaInfo: manyToManySchema,
    });

    expect(result).toEqual([
      {
        tableName: 'product',
        requiredColumns: ['product_id', 'product_name'],
        columnsInfo: [
          {
            column_name: 'product_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'product_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
        ],
        childTables: ['orderz_product'],
        hasMany: ['orderz_product'],
        belongsToMany: ['orderz'],
        pivotRelationships: [
          {
            relatedTable: 'orderz',
            pivotTable: 'orderz_product',
          },
        ],
      },
      {
        tableName: 'customer',
        requiredColumns: ['customer_id', 'name'],
        columnsInfo: [
          {
            column_name: 'customer_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'name',
            data_type: 'string',
            is_nullable: 'NO',
          },
        ],
        childTables: ['orderz'],
        hasMany: ['orderz'],
      },
      {
        tableName: 'orderz',
        requiredColumns: ['orderz_id', 'customer_id'],
        columnsInfo: [
          {
            column_name: 'orderz_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'customer_id',
            data_type: 'number',
            is_nullable: 'NO',

            foreign_key: {
              foreign_table_name: 'customer',
              foreign_column_name: 'customer_id',
            },
          },
        ],
        foreignTables: ['customer'],
        foreignKeys: ['customer_id'],
        childTables: ['orderz_product'],
        hasMany: ['orderz_product'],
        belongsTo: ['customer'],
        belongsToMany: ['product'],
        pivotRelationships: [
          {
            relatedTable: 'product',
            pivotTable: 'orderz_product',
          },
        ],
      },
      {
        tableName: 'orderz_product',
        requiredColumns: ['orderz_product_id', 'orderz_id', 'product_id'],
        columnsInfo: [
          {
            column_name: 'orderz_product_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'orderz_id',
            data_type: 'number',
            is_nullable: 'NO',
            foreign_key: {
              foreign_table_name: 'orderz',
              foreign_column_name: 'orderz_id',
            },
          },
          {
            column_name: 'product_id',
            data_type: 'number',
            is_nullable: 'NO',
            foreign_key: {
              foreign_table_name: 'product',
              foreign_column_name: 'product_id',
            },
          },
        ],
        foreignTables: ['orderz', 'product'],
        foreignKeys: ['orderz_id', 'product_id'],
        isPivot: true,

        belongsTo: ['orderz', 'product'],
      },
    ] satisfies ISchemaInfo[]);
  });

  test('should rename product table to productz and update all related references', () => {
    const result = renameTable({
      oldTableName: 'product',
      newTableName: 'productz',
      schemaInfo: manyToManySchema,
    });

    expect(result).toEqual([
      {
        tableName: 'productz',
        requiredColumns: ['productz_id', 'product_name'],
        columnsInfo: [
          {
            column_name: 'productz_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'product_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
        ],
        childTables: ['order_productz'],
        hasMany: ['order_productz'],
        belongsToMany: ['order'],
        pivotRelationships: [
          {
            relatedTable: 'order',
            pivotTable: 'order_productz',
          },
        ],
      },
      {
        tableName: 'customer',
        requiredColumns: ['customer_id', 'name'],
        columnsInfo: [
          {
            column_name: 'customer_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'name',
            data_type: 'string',
            is_nullable: 'NO',
          },
        ],
        childTables: ['order'],
        hasMany: ['order'],
      },
      {
        tableName: 'order',
        requiredColumns: ['order_id', 'customer_id'],
        columnsInfo: [
          {
            column_name: 'order_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'customer_id',
            data_type: 'number',
            is_nullable: 'NO',

            foreign_key: {
              foreign_table_name: 'customer',
              foreign_column_name: 'customer_id',
            },
          },
        ],
        foreignTables: ['customer'],
        foreignKeys: ['customer_id'],
        childTables: ['order_productz'],
        hasMany: ['order_productz'],
        belongsTo: ['customer'],
        belongsToMany: ['productz'],
        pivotRelationships: [
          {
            relatedTable: 'productz',
            pivotTable: 'order_productz',
          },
        ],
      },
      {
        tableName: 'order_productz',
        requiredColumns: ['order_productz_id', 'order_id', 'productz_id'],
        columnsInfo: [
          {
            column_name: 'order_productz_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'order_id',
            data_type: 'number',
            is_nullable: 'NO',

            foreign_key: {
              foreign_table_name: 'order',
              foreign_column_name: 'order_id',
            },
          },
          {
            column_name: 'productz_id',
            data_type: 'number',
            is_nullable: 'NO',

            foreign_key: {
              foreign_table_name: 'productz',
              foreign_column_name: 'productz_id',
            },
          },
        ],
        foreignTables: ['order', 'productz'],
        foreignKeys: ['order_id', 'productz_id'],
        isPivot: true,
        belongsTo: ['order', 'productz'],
      },
    ] satisfies ISchemaInfo[]);
  });

  test('should rename user table to userz and update all related references', () => {
    const result = renameTable({
      oldTableName: 'user',
      newTableName: 'userz',
      schemaInfo: oneToOneSchema,
    });

    expect(result).toEqual([
      {
        tableName: 'userz',
        requiredColumns: [
          'userz_id',
          'first_name',
          'last_name',
          'email',
          'username',
          'password',
          'created_at',
          'updated_at',
        ],
        columnsInfo: [
          {
            column_name: 'userz_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'first_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'last_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'email',
            data_type: 'string',
            is_nullable: 'NO',

            unique: true,
          },
          {
            column_name: 'username',
            data_type: 'string',
            is_nullable: 'NO',

            unique: true,
          },
          {
            column_name: 'password',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'created_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
          {
            column_name: 'updated_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
        ],
        childTables: ['post'],
        hasOne: ['post'],
      },
      {
        tableName: 'post',
        requiredColumns: [
          'post_id',
          'userz_id',
          'title',
          'created_at',
          'updated_at',
        ],
        columnsInfo: [
          {
            column_name: 'post_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'userz_id',
            data_type: 'number',
            is_nullable: 'NO',

            unique: true,
            foreign_key: {
              foreign_table_name: 'userz',
              foreign_column_name: 'userz_id',
            },
          },
          {
            column_name: 'title',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'content',
            data_type: 'string',
            is_nullable: 'YES',
          },
          {
            column_name: 'created_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
          {
            column_name: 'updated_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
        ],
        foreignTables: ['userz'],
        foreignKeys: ['userz_id'],
        belongsTo: ['userz'],
        isAuthResource: true,
        ownerField: 'user_id',
      },
    ] satisfies ISchemaInfo[]);
  });

  test('should rename post table to postz in one-to-many schema', () => {
    const result = renameTable({
      oldTableName: 'post',
      newTableName: 'postz',
      schemaInfo: oneToManySchema,
    });

    expect(result).toEqual([
      {
        tableName: 'user',
        requiredColumns: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'username',
          'password',
          'created_at',
          'updated_at',
        ],
        columnsInfo: [
          {
            column_name: 'user_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'first_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'last_name',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'email',
            data_type: 'string',
            is_nullable: 'NO',

            unique: true,
          },
          {
            column_name: 'username',
            data_type: 'string',
            is_nullable: 'NO',

            unique: true,
          },
          {
            column_name: 'password',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'created_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
          {
            column_name: 'updated_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
        ],
        childTables: ['postz'],
        hasMany: ['postz'],
      },
      {
        tableName: 'postz',
        requiredColumns: [
          'postz_id',
          'user_id',
          'title',
          'created_at',
          'updated_at',
        ],
        columnsInfo: [
          {
            column_name: 'postz_id',
            data_type: 'number',
            is_nullable: 'NO',
            column_default: 'AUTO_INCREMENT',
            primary_key: true,
          },
          {
            column_name: 'user_id',
            data_type: 'number',
            is_nullable: 'NO',

            foreign_key: {
              foreign_table_name: 'user',
              foreign_column_name: 'user_id',
            },
          },
          {
            column_name: 'title',
            data_type: 'string',
            is_nullable: 'NO',
          },
          {
            column_name: 'content',
            data_type: 'string',
            is_nullable: 'YES',
          },
          {
            column_name: 'created_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
          {
            column_name: 'updated_at',
            data_type: 'Date',
            is_nullable: 'NO',
          },
        ],
        foreignTables: ['user'],
        foreignKeys: ['user_id'],
        belongsTo: ['user'],
        isAuthResource: true,
        ownerField: 'user_id',
      },
    ] satisfies ISchemaInfo[]);
  });
});
