import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IBatchCreateData {
  dataArray: Omit<IOauthAccount, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionOauthAccount = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IOauthAccount[];
        failed: {
          data: Omit<IOauthAccount, 'id'>;
          error: string;
          index: number;
        }[];
        transactionId?: string;
      },
      Error,
      IBatchCreateData
    >,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dataArray, options: batchOptions }: IBatchCreateData) =>
      batchCreateWithTransaction<IOauthAccount, Omit<IOauthAccount, 'id'>>(
        '/oauthAccounts',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};
