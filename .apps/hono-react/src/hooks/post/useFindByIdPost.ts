import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IPost } from '@/interfaces/IPost';

export const useFindByIdPost = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IPost>>[2],
) =>
  useQueryInstance<IPost>(
    ['post', id],
    () => useFindById<IPost>('/posts', id),
    options,
  );