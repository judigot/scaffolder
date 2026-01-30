import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import findOrFail from './findOrFail/laravel.ts';
import findMany from './findMany/laravel.ts';
import random from './random/laravel.ts';
import latest from './latest/laravel.ts';
import oldest from './oldest/laravel.ts';
import orderBy from './orderBy/laravel.ts';
import groupBy from './groupBy/laravel.ts';

export default [
  findOrFail,
  findMany,
  random,
  latest,
  oldest,
  orderBy,
  groupBy,
] satisfies IMethod[];
