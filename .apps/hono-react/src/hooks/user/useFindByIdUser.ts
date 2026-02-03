import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IUser } from '@/interfaces/IUser';

export const useFindByIdUser = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IUser>>[2],
) =>
  useQueryInstance<IUser>(
    ['user', id],
    () => useFindById<IUser>('/users', id),
    options,
  );