import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import identifySchema from '@/utils/identifySchema.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
} from '@/json-schemas/index.ts';
import {
  setupTypeMappings,
  teardownTypeMappings,
} from '@/tests/helpers/setupTypeMappings.ts';

describe('identifySchema', () => {
  beforeEach(() => {
    setupTypeMappings();
  });

  afterEach(() => {
    teardownTypeMappings();
  });
  it('should correctly identify the full structure for usersPostOneToOneSchema', () => {
    const schemaInfo = identifySchema(usersPostOneToOneSchema);

    const referenceSchema: ISchemaInfo[] = [
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

        childTables: ['post'],
        hasOne: ['post'],
      },
      {
        tableName: 'post',
        requiredColumns: [
          'post_id',
          'user_id',
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
            column_name: 'user_id',
            data_type: 'number',
            is_nullable: 'NO',
            unique: true,
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
      },
    ];

    expect(schemaInfo).toStrictEqual(referenceSchema);
  });

  it('should correctly identify the full structure for usersPostsOneToManySchema', () => {
    const schemaInfo = identifySchema(usersPostsOneToManySchema);

    expect(schemaInfo).toStrictEqual([
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

        childTables: ['post'],

        hasMany: ['post'],
      },
      {
        tableName: 'post',
        requiredColumns: [
          'post_id',
          'user_id',
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
      },
    ]);
  });

  it('should correctly identify the full structure for POSSchema', () => {
    const schemaInfo = identifySchema(POSSchema);

    expect(schemaInfo).toStrictEqual([
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

        childTables: ['order_product'],

        hasMany: ['order_product'],

        belongsToMany: ['order'],
        pivotRelationships: [
          {
            relatedTable: 'order',
            pivotTable: 'order_product',
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

        childTables: ['order_product'],

        hasMany: ['order_product'],
        belongsTo: ['customer'],
        belongsToMany: ['product'],
        pivotRelationships: [
          {
            relatedTable: 'product',
            pivotTable: 'order_product',
          },
        ],
      },
      {
        tableName: 'order_product',
        requiredColumns: ['order_product_id', 'order_id', 'product_id'],
        columnsInfo: [
          {
            column_name: 'order_product_id',
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
            column_name: 'product_id',
            data_type: 'number',
            is_nullable: 'NO',
            foreign_key: {
              foreign_table_name: 'product',
              foreign_column_name: 'product_id',
            },
          },
        ],
        foreignTables: ['order', 'product'],
        foreignKeys: ['order_id', 'product_id'],
        isPivot: true,

        belongsTo: ['order', 'product'],
      },
    ]);
  });
});
