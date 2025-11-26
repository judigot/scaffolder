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
    childTables: ['event', 'order', 'user_user_types'],
    hasMany: ['event', 'order', 'user_user_types'],
    belongsToMany: ['user_types'],
    pivotRelationships: [
      {
        relatedTable: 'user_types',
        pivotTable: 'user_user_types',
      },
    ],
  },
  {
    tableName: 'event',
    columnsInfo: [
      {
        column_name: 'event_id',
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
        column_name: 'location',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'event_date',
        data_type: 'Date',
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
    requiredColumns: ['event_id', 'user_id'],
    foreignTables: ['user'],
    foreignKeys: ['user_id'],
    belongsTo: ['user'],
    hasMany: ['photo'],
    childTables: ['photo'],
  },
  {
    tableName: 'photo',
    columnsInfo: [
      {
        column_name: 'photo_id',
        data_type: 'number',
        is_nullable: 'NO',
        column_default: 'AUTO_INCREMENT',
        primary_key: true,
      },
      {
        column_name: 'event_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'event',
          foreign_column_name: 'event_id',
        },
      },
      {
        column_name: 'image_url',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'thumbnail_url',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'uploaded_at',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    requiredColumns: ['photo_id', 'event_id'],
    foreignTables: ['event'],
    foreignKeys: ['event_id'],
    belongsTo: ['event'],
    belongsToMany: ['tag', 'order'],
    hasMany: ['photo_tag', 'order_photo'],
    childTables: ['photo_tag', 'order_photo'],
    pivotRelationships: [
      {
        relatedTable: 'tag',
        pivotTable: 'photo_tag',
      },
      {
        relatedTable: 'order',
        pivotTable: 'order_photo',
      },
    ],
  },
  {
    tableName: 'order',
    columnsInfo: [
      {
        column_name: 'order_id',
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
        column_name: 'status',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'total_price',
        data_type: 'number',
        is_nullable: 'NO',
      },
      {
        column_name: 'created_at',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    requiredColumns: ['order_id', 'user_id'],
    foreignTables: ['user'],
    foreignKeys: ['user_id'],
    belongsTo: ['user'],
    belongsToMany: ['photo'],
    hasMany: ['order_photo'],
    childTables: ['order_photo'],
    pivotRelationships: [
      {
        relatedTable: 'photo',
        pivotTable: 'order_photo',
      },
    ],
  },
  {
    tableName: 'tag',
    columnsInfo: [
      {
        column_name: 'tag_id',
        data_type: 'number',
        is_nullable: 'NO',
        column_default: 'AUTO_INCREMENT',
        primary_key: true,
      },
      {
        column_name: 'name',
        data_type: 'string',
        is_nullable: 'NO',
        unique: true,
      },
    ],
    requiredColumns: ['tag_id'],
    belongsToMany: ['photo'],
    hasMany: ['photo_tag'],
    childTables: ['photo_tag'],
    pivotRelationships: [
      {
        relatedTable: 'photo',
        pivotTable: 'photo_tag',
      },
    ],
  },
  {
    tableName: 'photo_tag',
    columnsInfo: [
      {
        column_name: 'photo_tag_id',
        data_type: 'number',
        is_nullable: 'NO',
        column_default: 'AUTO_INCREMENT',
        primary_key: true,
      },
      {
        column_name: 'photo_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'photo',
          foreign_column_name: 'photo_id',
        },
      },
      {
        column_name: 'tag_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'tag',
          foreign_column_name: 'tag_id',
        },
      },
    ],
    requiredColumns: ['photo_tag_id', 'photo_id', 'tag_id'],
    foreignTables: ['photo', 'tag'],
    foreignKeys: ['photo_id', 'tag_id'],
    isPivot: true,
    belongsTo: ['photo', 'tag'],
  },
  {
    tableName: 'order_photo',
    columnsInfo: [
      {
        column_name: 'order_photo_id',
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
        column_name: 'photo_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'photo',
          foreign_column_name: 'photo_id',
        },
      },
    ],
    requiredColumns: ['order_photo_id', 'order_id', 'photo_id'],
    foreignTables: ['order', 'photo'],
    foreignKeys: ['order_id', 'photo_id'],
    isPivot: true,
    belongsTo: ['order', 'photo'],
  },
  {
    tableName: 'user_types',
    columnsInfo: [
      {
        column_name: 'user_types_id',
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
      {
        column_name: 'deleted_at',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    requiredColumns: ['user_types_id'],
    belongsToMany: ['user'],
    hasMany: ['user_user_types'],
    childTables: ['user_user_types'],
    pivotRelationships: [
      {
        relatedTable: 'user',
        pivotTable: 'user_user_types',
      },
    ],
    data: [
      {
        user_types_id: 1,
        name: 'superadmin',
        created_at: '2024-11-19T10:10:55.906Z',
        updated_at: '2024-11-19T10:10:55.906Z',
        deleted_at: '2024-11-19T10:10:55.906Z',
      },
      {
        user_types_id: 2,
        name: 'admin',
        created_at: '2024-11-19T10:10:55.906Z',
        updated_at: '2024-11-19T10:10:55.906Z',
        deleted_at: '2024-11-19T10:10:55.906Z',
      },
      {
        user_types_id: 3,
        name: 'user',
        created_at: '2024-11-19T10:10:55.906Z',
        updated_at: '2024-11-19T10:10:55.906Z',
        deleted_at: '2024-11-19T10:10:55.906Z',
      },
    ],
  },
  {
    tableName: 'user_user_types',
    columnsInfo: [
      {
        column_name: 'user_user_types_id',
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
        column_name: 'user_types_id',
        data_type: 'number',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'user_types',
          foreign_column_name: 'user_types_id',
        },
      },
    ],
    requiredColumns: ['user_user_types_id', 'user_id', 'user_types_id'],
    foreignTables: ['user', 'user_types'],
    foreignKeys: ['user_id', 'user_types_id'],
    isPivot: true,
    belongsTo: ['user', 'user_types'],
  },
  {
    tableName: 'discount_rule',
    columnsInfo: [
      {
        column_name: 'discount_rule_id',
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
      {
        column_name: 'type',
        data_type: 'string',
        is_nullable: 'NO',
      },
      {
        column_name: 'value',
        data_type: 'number',
        is_nullable: 'NO',
      },
      {
        column_name: 'min_quantity',
        data_type: 'number',
        is_nullable: 'NO',
      },
    ],
    requiredColumns: ['discount_rule_id'],
  },
];
