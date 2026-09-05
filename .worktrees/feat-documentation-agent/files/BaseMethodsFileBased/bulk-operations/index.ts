import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import batchUpdate from './batchUpdate/index.ts';
import updateOrCreate from './updateOrCreate/index.ts';

export default [batchUpdate, updateOrCreate] satisfies IMethod[];
