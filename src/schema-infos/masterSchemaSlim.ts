import type { ISchemaInfoSlim } from '@/interfaces/interfaces.ts';
export default [
  {
    tableName: 'product',
    columns: [
      {
        name: 'product_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'product_name',
        type: 'string',
      },
    ],
  },
  {
    tableName: 'customer',
    columns: [
      {
        name: 'customer_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'name',
        type: 'string',
      },
    ],
  },
  {
    tableName: 'order',
    columns: [
      {
        name: 'order_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'customer_id',
        type: 'number',
        foreignTable: {
          table: 'customer',
          column: 'customer_id',
        },
      },
    ],
  },
  {
    tableName: 'order_product',
    isPivot: true,
    columns: [
      {
        name: 'order_product_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'order_id',
        type: 'number',
        foreignTable: {
          table: 'order',
          column: 'order_id',
        },
      },
      {
        name: 'product_id',
        type: 'number',
        foreignTable: {
          table: 'product',
          column: 'product_id',
        },
      },
    ],
  },
  {
    tableName: 'user',
    columns: [
      {
        name: 'user_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'first_name',
        type: 'string',
      },
      {
        name: 'last_name',
        type: 'string',
      },
      {
        name: 'email',
        type: 'string',
        unique: true,
      },
      {
        name: 'username',
        type: 'string',
        unique: true,
      },
      {
        name: 'password',
        type: 'string',
      },
      {
        name: 'created_at',
        type: 'Date',
      },
      {
        name: 'updated_at',
        type: 'Date',
      },
    ],
  },
  {
    tableName: 'profile',
    columns: [
      {
        name: 'profile_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'user_id',
        type: 'number',
        unique: true,
        foreignTable: {
          table: 'user',
          column: 'user_id',
        },
      },
      {
        name: 'bio',
        type: 'string',
      },
      {
        name: 'created_at',
        type: 'Date',
      },
      {
        name: 'updated_at',
        type: 'Date',
      },
    ],
  },
  {
    tableName: 'posts',
    columns: [
      {
        name: 'post_id',
        type: 'number',
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'user_id',
        type: 'number',
        foreignTable: {
          table: 'user',
          column: 'user_id',
        },
      },
      {
        name: 'title',
        type: 'string',
      },
      {
        name: 'content',
        type: 'string',
        nullable: true,
      },
      {
        name: 'created_at',
        type: 'Date',
      },
      {
        name: 'updated_at',
        type: 'Date',
      },
    ],
  },
] satisfies ISchemaInfoSlim;
