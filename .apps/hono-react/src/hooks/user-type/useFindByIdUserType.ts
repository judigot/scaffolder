import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IUserType } from '@/interfaces/IUserType';

export const useFindByIdUserType = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IUserType>>[2],
) =>
  useQueryInstance<IUserType>(
    ['userType', id],
    () => useFindById<IUserType>('/userTypes', id),
    options,
  );
