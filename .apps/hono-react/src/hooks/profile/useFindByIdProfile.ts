import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IProfile } from '@/interfaces/IProfile';

export const useFindByIdProfile = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IProfile>>[2],
) =>
  useQueryInstance<IProfile>(
    ['profile', id],
    () => useFindById<IProfile>('/profiles', id),
    options,
  );