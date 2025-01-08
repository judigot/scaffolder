import generateDomainCode from '@/utils/generateDomainCode.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';

const userTableInfo = oneToMany.find((table) => table.tableName === 'user');

const userRelationships = generateDomainCode({
  schemaInfo: oneToMany,
  tableInfo: userTableInfo,
  tableName: 'user',
  codeToGenerate: 'modelContent',
});

// eslint-disable-next-line no-console
/*prettier-ignore*/ (($= userRelationships)=>{console.log(["string","number"].includes(typeof $)?$:JSON.stringify($,null,4));})();
