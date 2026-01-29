import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

export default [
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
] satisfies ISchemaInfo[];
