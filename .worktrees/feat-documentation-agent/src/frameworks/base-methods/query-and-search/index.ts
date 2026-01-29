import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import findByAttributes from './findByAttributes/laravel.ts';
import paginate from './paginate/laravel.ts';
import search from './search/laravel.ts';
import count from './count/laravel.ts';
import exists from './exists/laravel.ts';

export default [
  findByAttributes,
  paginate,
  search,
  count,
  exists,
] satisfies IMethod[];
