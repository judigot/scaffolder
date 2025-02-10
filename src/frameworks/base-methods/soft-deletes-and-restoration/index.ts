import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import softDelete from './softDelete/laravel.ts';
import restore from './restore/laravel.ts';
import withTrashed from './withTrashed/laravel.ts';
import onlyTrashed from './onlyTrashed/laravel.ts';
import withoutTrashed from './withoutTrashed/laravel.ts';

export default [
  softDelete,
  restore,
  withTrashed,
  onlyTrashed,
  withoutTrashed,
] satisfies IMethod[];
