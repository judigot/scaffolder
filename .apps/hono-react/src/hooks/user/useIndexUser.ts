import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IUser } from '@/interfaces/IUser';

export const useUser = (
  options?: Parameters<typeof useQueryInstance<IUser[]>>[2],
) => useQueryInstance<IUser[]>('users', () => useIndex('users'), options);