import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenPosts = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'whereBetween', params.column, params.min, params.max],
    queryFn: () =>
      whereBetweenResources<IPost>(
        '/posts/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};