import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IUserType } from '@/interfaces/IUserType';

export const useUserType = (
  options?: Parameters<typeof useQueryInstance<IUserType[]>>[2],
) =>
  useQueryInstance<IUserType[]>(
    'userTypes',
    () => useIndex('userTypes'),
    options,
  );
