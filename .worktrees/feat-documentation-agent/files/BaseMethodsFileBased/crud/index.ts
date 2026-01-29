import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import index from './index/index.ts';
import findById from './findById/index.ts';
import create from './create/index.ts';
import update from './update/index.ts';
import destroy from './destroy/index.ts';

export default [index, findById, create, update, destroy] satisfies IMethod[];
