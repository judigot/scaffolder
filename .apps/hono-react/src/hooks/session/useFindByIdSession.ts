import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type ISession } from '@/interfaces/ISession';

export const useFindByIdSession = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<ISession>>[2],
) =>
  useQueryInstance<ISession>(
    ['session', id],
    () => useFindById<ISession>('/sessions', id),
    options,
  );