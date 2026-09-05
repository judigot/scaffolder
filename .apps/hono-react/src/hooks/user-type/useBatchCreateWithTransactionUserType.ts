import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IBatchCreateData {
  dataArray: Omit<IUserType, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionUserType = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IUserType[];
        failed: { data: Omit<IUserType, 'id'>; error: string; index: number }[];
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
      batchCreateWithTransaction<IUserType, Omit<IUserType, 'id'>>(
        '/userTypes',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};