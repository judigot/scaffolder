import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import softDelete from './softDelete/index.ts';
import restore from './restore/index.ts';
import withTrashed from './withTrashed/index.ts';
import onlyTrashed from './onlyTrashed/index.ts';
import withoutTrashed from './withoutTrashed/index.ts';

export default [
  softDelete,
  restore,
  withTrashed,
  onlyTrashed,
  withoutTrashed,
] satisfies IMethod[];
