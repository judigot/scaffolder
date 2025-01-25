import { ISchemaInfo } from '@/interfaces/interfaces.ts';

export default [
  {
    tableName: 'product',
    requiredColumns: ['product_id', 'product_name'],
    columnsInfo: [
      {
        column_name: 'product_id',
        data_type: 'number',
        is_nullable: 'NO',
        column_default: 'AUTO_INCREMENT',
        primary_key: true
      },
      {
        column_name: 'product_name',
        data_type: 'string',
        is_nullable: 'NO'
      }
    ],
    childTables: ['order_product'],
    hasMany: ['order_product'],
    belongsToMany: ['order'],
    pivotRelationships: [
      {
        relatedTable: 'order',
        pivotTable: 'order_product'
      }
    ]
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
        primary_key: true
      },
      {
        column_name: 'name',
        data_type: 'string',
        is_nullable: 'NO'
      }
    ],
    childTables: ['order'],
    hasMany: ['order']
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
        primary_key: true
      },
      {
        column_name: 'customer_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'customer',
          foreign_column_name: 'customer_id'
        }
      }
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
        pivotTable: 'order_product'
      }
    ]
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
        primary_key: true
      },
      {
        column_name: 'order_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'order',
          foreign_column_name: 'order_id'
        }
      },
      {
        column_name: 'product_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'product',
          foreign_column_name: 'product_id'
        }
      }
    ],
    isPivot: true,
    foreignTables: ['order', 'product'],
    foreignKeys: ['order_id', 'product_id'],
    belongsTo: ['order', 'product']
  }
] satisfies ISchemaInfo[];
