import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct';

export const useFindByIdOrderProduct = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IOrderProduct>>[2],
) =>
  useQueryInstance<IOrderProduct>(
    ['orderProduct', id],
    () => useFindById<IOrderProduct>('/orderProducts', id),
    options,
  );