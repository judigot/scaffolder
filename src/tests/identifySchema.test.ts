import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';

describe('identifySchema', () => {
  it('should correctly identify the full structure for POSSchema', () => {
    const schemaInfo = identifySchema(POSSchema);

    // Validate the product table
    const product = schemaInfo.find((t) => t.table === 'product');
    expect(product).toEqual({
      table: 'product',
      tablePlural: 'products',
      requiredColumns: ['product_id', 'product_name'],
      columnsInfo: [
        {
          column_name: 'product_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: "nextval('product_product_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'product_name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: [],
      foreignKeys: [],
      isPivot: false,
      childTables: ['order_product'],
      hasOne: [],
      hasMany: ['order_product'],
      belongsTo: [],
      belongsToMany: ['order'],
      pivotRelationships: [
        { relatedTable: 'order', pivotTable: 'order_product' },
      ],
    });

    // Validate the customer table
    const customer = schemaInfo.find((t) => t.table === 'customer');
    expect(customer).toEqual({
      table: 'customer',
      tablePlural: 'customers',
      requiredColumns: ['customer_id', 'name'],
      columnsInfo: [
        {
          column_name: 'customer_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: "nextval('customer_customer_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: [],
      foreignKeys: [],
      isPivot: false,
      childTables: ['order'],
      hasOne: [],
      hasMany: ['order'],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    });

    // Validate the order table
    const order = schemaInfo.find((t) => t.table === 'order');
    expect(order).toEqual({
      table: 'order',
      tablePlural: 'orders',
      requiredColumns: ['order_id', 'customer_id'],
      columnsInfo: [
        {
          column_name: 'order_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: "nextval('order_order_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'customer_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: {
            foreign_table_name: 'customer',
            foreign_column_name: 'customer_id',
          },
        },
      ],
      foreignTables: ['customer'],
      foreignKeys: ['customer_id'],
      isPivot: false,
      childTables: ['order_product'],
      hasOne: [],
      hasMany: ['order_product'],
      belongsTo: ['customer'],
      belongsToMany: ['product'],
      pivotRelationships: [
        { relatedTable: 'product', pivotTable: 'order_product' },
      ],
    });

    // Validate the order_product table
    const orderProduct = schemaInfo.find((t) => t.table === 'order_product');
    expect(orderProduct).toEqual({
      table: 'order_product',
      tablePlural: 'order_products',
      requiredColumns: ['order_product_id', 'order_id', 'product_id'],
      columnsInfo: [
        {
          column_name: 'order_product_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default:
            "nextval('order_product_order_product_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'order_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: {
            foreign_table_name: 'order',
            foreign_column_name: 'order_id',
          },
        },
        {
          column_name: 'product_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: {
            foreign_table_name: 'product',
            foreign_column_name: 'product_id',
          },
        },
      ],
      foreignTables: ['order', 'product'],
      foreignKeys: ['order_id', 'product_id'],
      isPivot: true,
      childTables: [],
      hasOne: [],
      hasMany: [],
      belongsTo: ['order', 'product'],
      belongsToMany: [],
      pivotRelationships: [],
    });
  });

  it('should correctly identify the full structure for usersPostOneToOneSchema', () => {
    const schemaInfo = identifySchema(usersPostOneToOneSchema);

    // Validate the user table
    const user = schemaInfo.find((t) => t.table === 'user');
    expect(user).toEqual({
      table: 'user',
      tablePlural: 'users',
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
          column_default: "nextval('user_user_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'first_name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'last_name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'email',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: true,
          foreign_key: null,
        },
        {
          column_name: 'username',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: true,
          foreign_key: null,
        },
        {
          column_name: 'password',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'created_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'updated_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: [],
      foreignKeys: [],
      isPivot: false,
      childTables: ['post'],
      hasOne: ['post'],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    });

    // Validate the post table
    const post = schemaInfo.find((t) => t.table === 'post');
    expect(post).toEqual({
      table: 'post',
      tablePlural: 'posts',
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
          column_default: "nextval('post_post_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        },
        {
          column_name: 'title',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'content',
          data_type: 'string',
          is_nullable: 'YES',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'created_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'updated_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: ['user'],
      foreignKeys: ['user_id'],
      isPivot: false,
      childTables: [],
      hasOne: [],
      hasMany: [],
      belongsTo: ['user'],
      belongsToMany: [],
      pivotRelationships: [],
    });
  });

  it('should correctly identify the full structure for usersPostsOneToManySchema', () => {
    const schemaInfo = identifySchema(usersPostsOneToManySchema);

    // Validate the user table
    const user = schemaInfo.find((t) => t.table === 'user');
    expect(user).toEqual({
      table: 'user',
      tablePlural: 'users',
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
          column_default: "nextval('user_user_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'first_name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'last_name',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'email',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: true,
          foreign_key: null,
        },
        {
          column_name: 'username',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: true,
          foreign_key: null,
        },
        {
          column_name: 'password',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'created_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'updated_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: [],
      foreignKeys: [],
      isPivot: false,
      childTables: ['post'],
      hasOne: [],
      hasMany: ['post'],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    });

    // Validate the post table
    const post = schemaInfo.find((t) => t.table === 'post');
    expect(post).toEqual({
      table: 'post',
      tablePlural: 'posts',
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
          column_default: "nextval('post_post_id_seq'::regclass)",
          primary_key: true,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'user_id',
          data_type: 'number',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        },
        {
          column_name: 'title',
          data_type: 'string',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'content',
          data_type: 'string',
          is_nullable: 'YES',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'created_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
        {
          column_name: 'updated_at',
          data_type: 'Date',
          is_nullable: 'NO',
          column_default: null,
          primary_key: false,
          unique: false,
          foreign_key: null,
        },
      ],
      foreignTables: ['user'],
      foreignKeys: ['user_id'],
      isPivot: false,
      childTables: [],
      hasOne: [],
      hasMany: [],
      belongsTo: ['user'],
      belongsToMany: [],
      pivotRelationships: [],
    });
  });
});
