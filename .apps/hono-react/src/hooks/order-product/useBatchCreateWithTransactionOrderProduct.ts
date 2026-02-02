import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IBatchCreateData {
  dataArray: Omit<IOrderProduct, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionOrderProduct = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IOrderProduct[];
        failed: {
          data: Omit<IOrderProduct, 'id'>;
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
      batchCreateWithTransaction<IOrderProduct, Omit<IOrderProduct, 'id'>>(
        '/orderProducts',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};