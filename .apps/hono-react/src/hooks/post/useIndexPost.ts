import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IPost } from '@/interfaces/IPost';

export const usePost = (
  options?: Parameters<typeof useQueryInstance<IPost[]>>[2],
) => useQueryInstance<IPost[]>('posts', () => useIndex('posts'), options);