import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import getWithRelations from './getWithRelations/index.ts';
import pluck from './pluck/index.ts';
import firstOrCreate from './firstOrCreate/index.ts';
import firstOrNew from './firstOrNew/index.ts';
import chunk from './chunk/index.ts';
import each from './each/index.ts';
import whereIn from './whereIn/index.ts';
import whereNotIn from './whereNotIn/index.ts';
import whereBetween from './whereBetween/index.ts';

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
