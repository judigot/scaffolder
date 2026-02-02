import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IProduct } from '@/interfaces/IProduct';

export const useProduct = (
  options?: Parameters<typeof useQueryInstance<IProduct[]>>[2],
) =>
  useQueryInstance<IProduct[]>('products', () => useIndex('products'), options);