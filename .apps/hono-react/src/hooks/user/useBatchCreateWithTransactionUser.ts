import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IBatchCreateData {
  dataArray: Omit<IUser, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionUser = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IUser[];
        failed: { data: Omit<IUser, 'id'>; error: string; index: number }[];
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
      batchCreateWithTransaction<IUser, Omit<IUser, 'id'>>(
        '/users',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};