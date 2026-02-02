import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IBatchCreateData {
  dataArray: Omit<IUserUserType, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionUserUserType = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IUserUserType[];
        failed: {
          data: Omit<IUserUserType, 'id'>;
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
      batchCreateWithTransaction<IUserUserType, Omit<IUserUserType, 'id'>>(
        '/userUserTypes',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};
