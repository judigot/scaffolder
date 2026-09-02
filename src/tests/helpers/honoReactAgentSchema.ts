export const honoReactSchemaFilter = [
  'user',
  'session',
  'user.id.data_type=uuid',
  'session.userId.foreign_key',
];

export const honoReactAgentSchemaInfo = [
  {
    tableName: 'user',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        primary_key: true,
      },
      {
        column_name: 'email',
        data_type: 'string',
        is_nullable: 'NO',
        unique: true,
      },
      {
        column_name: 'createdAt',
        data_type: 'Date',
        is_nullable: 'NO',
      },
      {
        column_name: 'updatedAt',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    hasMany: ['session'],
  },
  {
    tableName: 'session',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'string',
        is_nullable: 'NO',
        primary_key: true,
      },
      {
        column_name: 'userId',
        data_type: 'uuid',
        is_nullable: 'NO',
        foreign_key: {
          foreign_table_name: 'user',
          foreign_column_name: 'id',
        },
      },
      {
        column_name: 'expiresAt',
        data_type: 'Date',
        is_nullable: 'NO',
      },
    ],
    belongsTo: ['user'],
    foreignTables: ['user'],
  },
];

export const honoReactCompactSchema = `<@@SCHEMA@@>
@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session
@session:id:s#pk,userId:u>user,expiresAt:D|<user
<@@/SCHEMA@@>`;
