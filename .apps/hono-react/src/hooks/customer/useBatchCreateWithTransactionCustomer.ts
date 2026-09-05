import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IBatchCreateData {
  dataArray: Omit<ICustomer, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionCustomer = (
  options?: Omit<
    UseMutationOptions<
      {
        success: ICustomer[];
        failed: { data: Omit<ICustomer, 'id'>; error: string; index: number }[];
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
      batchCreateWithTransaction<ICustomer, Omit<ICustomer, 'id'>>(
        '/customers',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
};