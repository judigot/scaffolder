import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import batchUpdate from './batchUpdate/laravel.ts';
import updateOrCreate from './updateOrCreate/laravel.ts';

export default [batchUpdate, updateOrCreate] satisfies IMethod[];
