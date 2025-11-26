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
        foreign: 'customer',
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
        foreign: 'order',
      },
      {
        name: 'product_id',
        type: 'number',
        foreign: 'product',
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
        foreign: 'user',
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
        foreign: 'user',
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
];
