export default [
  {
    tableName: 'product',
    columns: [
      {
        name: 'product_id',
        type: 'number',
        nullable: false,
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      { name: 'product_name', type: 'string', nullable: false },
    ],
  },
  {
    tableName: 'customer',
    columns: [
      {
        name: 'customer_id',
        type: 'number',
        nullable: false,
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      { name: 'name', type: 'string', nullable: false },
    ],
  },
  {
    tableName: 'order',
    columns: [
      {
        name: 'order_id',
        type: 'number',
        nullable: false,
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'customer_id',
        type: 'number',
        nullable: false,
        foreignTable: { table: 'customer', column: 'customer_id' },
      },
    ],
  },
  {
    tableName: 'order_product',
    columns: [
      {
        name: 'order_product_id',
        type: 'number',
        nullable: false,
        default: 'AUTO_INCREMENT',
        primaryKey: true,
      },
      {
        name: 'order_id',
        type: 'number',
        nullable: false,
        foreignTable: { table: 'order', column: 'order_id' },
      },
      {
        name: 'product_id',
        type: 'number',
        nullable: false,
        foreignTable: { table: 'product', column: 'product_id' },
      },
    ],
    isPivot: true,
  },
];
