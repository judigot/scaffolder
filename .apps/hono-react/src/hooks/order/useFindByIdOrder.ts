import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IOrder } from '@/interfaces/IOrder';

export const useFindByIdOrder = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IOrder>>[2],
) =>
  useQueryInstance<IOrder>(
    ['order', id],
    () => useFindById<IOrder>('/orders', id),
    options,
  );