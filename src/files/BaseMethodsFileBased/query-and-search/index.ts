import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import findByAttributes from './findByAttributes/index.ts';
import paginate from './paginate/index.ts';
import search from './search/index.ts';
import count from './count/index.ts';
import exists from './exists/index.ts';

export default [
  findByAttributes,
  paginate,
  search,
  count,
  exists,
] satisfies IMethod[];
