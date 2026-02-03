import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IProfile } from '@/interfaces/IProfile';

export const useProfile = (
  options?: Parameters<typeof useQueryInstance<IProfile[]>>[2],
) =>
  useQueryInstance<IProfile[]>('profiles', () => useIndex('profiles'), options);