import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import findOrFail from './findOrFail/index.ts';
import findMany from './findMany/index.ts';
import random from './random/index.ts';
import latest from './latest/index.ts';
import oldest from './oldest/index.ts';
import orderBy from './orderBy/index.ts';
import groupBy from './groupBy/index.ts';

export default [
  findOrFail,
  findMany,
  random,
  latest,
  oldest,
  orderBy,
  groupBy,
] satisfies IMethod[];
