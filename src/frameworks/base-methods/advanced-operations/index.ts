import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import getWithRelations from './getWithRelations/laravel.ts';
import pluck from './pluck/laravel.ts';
import firstOrCreate from './firstOrCreate/laravel.ts';
import firstOrNew from './firstOrNew/laravel.ts';
import chunk from './chunk/laravel.ts';
import each from './each/laravel.ts';
import whereIn from './whereIn/laravel.ts';
import whereNotIn from './whereNotIn/laravel.ts';
import whereBetween from './whereBetween/laravel.ts';

export default [
  getWithRelations,
  pluck,
  firstOrCreate,
  firstOrNew,
  chunk,
  each,
  whereIn,
  whereNotIn,
  whereBetween,
] satisfies IMethod[];
