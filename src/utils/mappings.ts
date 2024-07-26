export const columnMappings = {
  'sql-tables': {
    columnTemplate: '$COLUMN_NAME $MAPPED_TYPE',
    unique: 'UNIQUE',
    nullable: '',
    notNullable: 'NOT NULL',
  },
  'ts-interfaces': {
    columnTemplate: '$COLUMN_NAME: $MAPPED_TYPE',
    unique: '',
    nullable: ' | null',
    notNullable: '',
  },
} as const;
