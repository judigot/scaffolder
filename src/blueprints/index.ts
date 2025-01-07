import generateDomainCode from '@/utils/generateDomainCode.ts';
import oneToMany from '@/schema-infos/oneToMany.ts';

const userTableInfo = oneToMany.find((table) => table.tableName === 'user');

const userRelationships = generateDomainCode({
  schemaInfo: oneToMany,
  tableInfo: userTableInfo,
  tableName: 'user',
  codeToGenerate: 'modelContent',
});

/*prettier-ignore*/ (($= userRelationships)=>{console.log(["string","number"].includes(typeof $)?$:JSON.stringify($,null,4));})();
