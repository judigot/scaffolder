import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount';

export const useFindByIdOauthAccount = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IOauthAccount>>[2],
) =>
  useQueryInstance<IOauthAccount>(
    ['oauthAccount', id],
    () => useFindById<IOauthAccount>('/oauthAccounts', id),
    options,
  );
