import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenSessions = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'sessions',
      'whereBetween',
      params.column,
      params.min,
      params.max,
    ],
    queryFn: () =>
      whereBetweenResources<ISession>(
        '/sessions/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};
