import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type ISession } from '@/interfaces/ISession';

export const useSession = (
  options?: Parameters<typeof useQueryInstance<ISession[]>>[2],
) =>
  useQueryInstance<ISession[]>('sessions', () => useIndex('sessions'), options);
