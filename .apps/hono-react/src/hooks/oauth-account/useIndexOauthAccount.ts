import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount';

export const useOauthAccount = (
  options?: Parameters<typeof useQueryInstance<IOauthAccount[]>>[2],
) =>
  useQueryInstance<IOauthAccount[]>(
    'oauthAccounts',
    () => useIndex('oauthAccounts'),
    options,
  );