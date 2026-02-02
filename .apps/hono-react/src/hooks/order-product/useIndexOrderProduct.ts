import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct';

export const useOrderProduct = (
  options?: Parameters<typeof useQueryInstance<IOrderProduct[]>>[2],
) =>
  useQueryInstance<IOrderProduct[]>(
    'orderProducts',
    () => useIndex('orderProducts'),
    options,
  );