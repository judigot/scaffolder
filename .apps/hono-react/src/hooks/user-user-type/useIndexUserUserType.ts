import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType';

export const useUserUserType = (
  options?: Parameters<typeof useQueryInstance<IUserUserType[]>>[2],
) =>
  useQueryInstance<IUserUserType[]>(
    'userUserTypes',
    () => useIndex('userUserTypes'),
    options,
  );