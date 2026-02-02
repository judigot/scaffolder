import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findByAttributesResources } from '@/hooks/shared/useFindByAttributes.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IFindByAttributesParams {
  attributes: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindByAttributesPosts = (
  params: IFindByAttributesParams,
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'posts',
      'findByAttributes',
      params.attributes,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findByAttributesResources<IPost>(
        '/posts/find-by-attributes',
        params.attributes,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(
      params.attributes && Object.keys(params.attributes).length > 0,
    ),
    ...options,
  });
};