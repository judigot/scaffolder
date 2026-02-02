import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchCreateWithTransaction } from '@/hooks/shared/usebatchCreateWithTransaction.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IBatchCreateData {
  dataArray: Omit<IProfile, 'id'>[];
  options?: {
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  };
}

export const usebatchCreateWithTransactionProfile = (
  options?: Omit<
    UseMutationOptions<
      {
        success: IProfile[];
        failed: { data: Omit<IProfile, 'id'>; error: string; index: number }[];
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
      batchCreateWithTransaction<IProfile, Omit<IProfile, 'id'>>(
        '/profiles',
        dataArray,
        batchOptions,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};