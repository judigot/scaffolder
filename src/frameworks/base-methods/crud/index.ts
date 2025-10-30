import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import index from './index/laravel.ts';
import findById from './findById/laravel.ts';
import create from './create/laravel.ts';
import update from './update/laravel.ts';
import destroy from './destroy/laravel.ts';

export default [index, findById, create, update, destroy] satisfies IMethod[];
