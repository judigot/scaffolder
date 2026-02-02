import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType';

export const useFindByIdUserUserType = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IUserUserType>>[2],
) =>
  useQueryInstance<IUserUserType>(
    ['userUserType', id],
    () => useFindById<IUserUserType>('/userUserTypes', id),
    options,
  );
