import NQLParser from './NQLParser.ts';

const schemaInfo = NQLParser(`
Relationships:
users have many posts
orders have many products via pivot
`);

// eslint-disable-next-line no-console
console.log(schemaInfo);
