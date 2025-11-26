export const SQLQueries = {
  quote: {
    mysql: '`',
    postgresql: '"',
  },
  dropTables: {
    mysql: 'DROP TABLE IF EXISTS `$TABLE_NAME`;',
    postgresql: 'DROP TABLE IF EXISTS "$TABLE_NAME";',
  },
};
