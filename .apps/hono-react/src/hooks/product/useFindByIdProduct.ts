import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type IProduct } from '@/interfaces/IProduct';

export const useFindByIdProduct = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<IProduct>>[2],
) =>
  useQueryInstance<IProduct>(
    ['product', id],
    () => useFindById<IProduct>('/products', id),
    options,
  );