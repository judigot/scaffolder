import { describe, it, expect } from 'vitest';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure.ts';
import type {
  IIntrospectedSchemaInfo,
  ISchemaInfo,
} from '@/interfaces/interfaces.ts';
import manyToMany from '@/schema-infos/manyToMany.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';
import oneToOne from '@/schema-infos/oneToOne.ts';

describe('convertIntrospectedStructure', () => {
  const usersPostOneToOneSchema: IIntrospectedSchemaInfo[] = [
    {
      table_name: 'post',
      columns: [
        {
          column_name: 'post_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('post_post_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'user_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          unique: true,
          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        },
        {
          column_name: 'title',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'content',
          data_type: 'text',
          is_nullable: 'YES',
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
      ],
      check_constraints: [
        'title IS NOT NULL',
        'created_at IS NOT NULL',
        'updated_at IS NOT NULL',
        'user_id IS NOT NULL',
        'post_id IS NOT NULL',
      ],
      composite_unique_constraints: null,
    },
    {
      table_name: 'user',
      columns: [
        {
          column_name: 'user_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('user_user_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'first_name',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'last_name',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'email',
          data_type: 'text',
          is_nullable: 'NO',

          unique: true,
        },
        {
          column_name: 'username',
          data_type: 'text',
          is_nullable: 'NO',

          unique: true,
        },
        {
          column_name: 'password',
          data_type: 'character',
          is_nullable: 'NO',
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
      ],
      check_constraints: [
        'user_id IS NOT NULL',
        'email IS NOT NULL',
        'username IS NOT NULL',
        'updated_at IS NOT NULL',
        'password IS NOT NULL',
        'last_name IS NOT NULL',
        'created_at IS NOT NULL',
        'first_name IS NOT NULL',
      ],
      composite_unique_constraints: null,
    },
  ];

  const usersPostsOneToManySchema: IIntrospectedSchemaInfo[] = [
    {
      table_name: 'post',
      columns: [
        {
          column_name: 'post_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('post_post_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'user_id',
          data_type: 'bigint',
          is_nullable: 'NO',

          foreign_key: {
            foreign_table_name: 'user',
            foreign_column_name: 'user_id',
          },
        },
        {
          column_name: 'title',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'content',
          data_type: 'text',
          is_nullable: 'YES',
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
      ],
      check_constraints: [
        'post_id IS NOT NULL',
        'user_id IS NOT NULL',
        'title IS NOT NULL',
        'created_at IS NOT NULL',
        'updated_at IS NOT NULL',
      ],
      composite_unique_constraints: null,
    },
    {
      table_name: 'user',
      columns: [
        {
          column_name: 'user_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('user_user_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'first_name',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'last_name',
          data_type: 'text',
          is_nullable: 'NO',
        },
        {
          column_name: 'email',
          data_type: 'text',
          is_nullable: 'NO',

          unique: true,
        },
        {
          column_name: 'username',
          data_type: 'text',
          is_nullable: 'NO',

          unique: true,
        },
        {
          column_name: 'password',
          data_type: 'character',
          is_nullable: 'NO',
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
      ],
      check_constraints: [
        'user_id IS NOT NULL',
        'first_name IS NOT NULL',
        'last_name IS NOT NULL',
        'email IS NOT NULL',
        'username IS NOT NULL',
        'password IS NOT NULL',
        'created_at IS NOT NULL',
        'updated_at IS NOT NULL',
      ],
      composite_unique_constraints: null,
    },
  ];

  const POSSchema: IIntrospectedSchemaInfo[] = [
    {
      table_name: 'customer',
      columns: [
        {
          column_name: 'customer_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('customer_customer_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'name',
          data_type: 'text',
          is_nullable: 'NO',
        },
      ],
      check_constraints: ['customer_id IS NOT NULL', 'name IS NOT NULL'],
      composite_unique_constraints: null,
    },
    {
      table_name: 'order',
      columns: [
        {
          column_name: 'order_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('order_order_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'customer_id',
          data_type: 'bigint',
          is_nullable: 'NO',

          foreign_key: {
            foreign_table_name: 'customer',
            foreign_column_name: 'customer_id',
          },
        },
      ],
      check_constraints: ['order_id IS NOT NULL', 'customer_id IS NOT NULL'],
      composite_unique_constraints: null,
    },
    {
      table_name: 'order_product',
      columns: [
        {
          column_name: 'order_product_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default:
            "nextval('order_product_order_product_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'order_id',
          data_type: 'bigint',
          is_nullable: 'NO',

          foreign_key: {
            foreign_table_name: 'order',
            foreign_column_name: 'order_id',
          },
        },
        {
          column_name: 'product_id',
          data_type: 'bigint',
          is_nullable: 'NO',

          foreign_key: {
            foreign_table_name: 'product',
            foreign_column_name: 'product_id',
          },
        },
      ],
      check_constraints: [
        'product_id IS NOT NULL',
        'order_id IS NOT NULL',
        'order_product_id IS NOT NULL',
      ],
      composite_unique_constraints: null,
    },
    {
      table_name: 'product',
      columns: [
        {
          column_name: 'product_id',
          data_type: 'bigint',
          is_nullable: 'NO',
          column_default: "nextval('product_product_id_seq'::regclass)",
          primary_key: true,
        },
        {
          column_name: 'product_name',
          data_type: 'text',
          is_nullable: 'NO',
        },
      ],
      check_constraints: ['product_name IS NOT NULL', 'product_id IS NOT NULL'],
      composite_unique_constraints: null,
    },
  ];

  it('should correctly convert and identify the full structure for usersPostOneToOneSchema (PostgreSQL)', () => {
    const schemaInfo = convertIntrospectedStructure(usersPostOneToOneSchema);

    const referenceSchema: ISchemaInfo[] = oneToOne;

    expect(schemaInfo).toStrictEqual(referenceSchema);
  });

  it('should correctly convert and identify the full structure for usersPostsOneToManySchema (PostgreSQL)', () => {
    const schemaInfo = convertIntrospectedStructure(usersPostsOneToManySchema);

    const referenceSchema: ISchemaInfo[] = oneToMany;

    expect(schemaInfo).toStrictEqual(referenceSchema);
  });

  it('should correctly convert and identify the full structure for POSSchema (PostgreSQL)', () => {
    const schemaInfo = convertIntrospectedStructure(POSSchema);

    const referenceSchema: ISchemaInfo[] = manyToMany;

    expect(schemaInfo).toStrictEqual(referenceSchema);
  });
});
