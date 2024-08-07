export const SQLQueries = {
  quote: {
    mysql: '`',
    postgresql: '"',
  },
  dropTables: {
    mysql: 'DROP TABLE IF EXISTS `$TABLE_NAME`;',
    postgresql: 'DROP TABLE IF EXISTS "$TABLE_NAME";',
  },
} as const;

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

export const typeMappings: Record<
  string,
  {
    mysql: string;
    postgresql: string;
    typescript: string;
    'postgresql-introspected': string[];
    'mysql-introspected': string[];
  }
> = {
  primaryKey: {
    mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
    postgresql: 'BIGSERIAL PRIMARY KEY',
    typescript: 'number',
    'postgresql-introspected': [
      'bigint',
      'serial',
      'serial8',
      'serial4',
      'uuid',
      'bigserial',
      'smallserial',
      'smallint',
      'integer',
    ],
    'mysql-introspected': ['bigint', 'uuid', 'serial', 'int', 'tinyint'],
  },
  password: {
    mysql: 'CHAR(60)',
    postgresql: 'CHAR(60)',
    typescript: 'string',
    'postgresql-introspected': ['character', 'char'],
    'mysql-introspected': ['char(60)'],
  },
  number: {
    mysql: 'BIGINT',
    postgresql: 'BIGINT',
    typescript: 'number',
    'postgresql-introspected': [
      'bigint',
      'int8',
      'int4',
      'int2',
      'smallint',
      'integer',
      'smallserial',
      'serial2',
      'serial4',
      'serial8',
      'bigserial',
    ],
    'mysql-introspected': [
      'bigint',
      'int',
      'smallint',
      'tinyint',
      'mediumint',
      'decimal',
    ],
  },
  float: {
    mysql: 'DECIMAL(10, 2)',
    postgresql: 'NUMERIC(10, 2)',
    typescript: 'number',
    'postgresql-introspected': [
      'numeric',
      'decimal',
      'real',
      'double precision',
      'float8',
      'float4',
      'double',
    ],
    'mysql-introspected': ['decimal(10,2)', 'float', 'double', 'real', 'dec'],
  },
  string: {
    mysql: 'VARCHAR (32)',
    postgresql: 'TEXT',
    typescript: 'string',
    'postgresql-introspected': [
      'text',
      'character varying',
      'varchar',
      'char',
      'name',
      'uuid',
      'bpchar',
      'character',
      'varchar2',
      'nvarchar',
      'nvarchar2',
      'citext',
      'json',
      'jsonb',
    ],
    'mysql-introspected': [
      'text',
      'varchar',
      'char',
      'uuid',
      'tinytext',
      'mediumtext',
      'longtext',
      'json',
    ],
  },
  boolean: {
    mysql: 'BOOLEAN',
    postgresql: 'BOOLEAN',
    typescript: 'boolean',
    'postgresql-introspected': ['boolean', 'bool'],
    'mysql-introspected': ['tinyint(1)', 'bit'],
  },
  Date: {
    mysql: 'TIMESTAMP(6)',
    postgresql: 'TIMESTAMPTZ(6)',
    typescript: 'Date',
    'postgresql-introspected': [
      'timestamp with time zone',
      'timestamptz',
      'timestamp',
      'timestamp without time zone',
      'date',
      'time',
      'timetz',
      'time with time zone',
      'time without time zone',
      'interval',
    ],
    'mysql-introspected': ['timestamp', 'date', 'time', 'datetime', 'year'],
  },
} as const;
