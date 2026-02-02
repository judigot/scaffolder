import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type IOrder } from '@/interfaces/IOrder';

export const useOrder = (
  options?: Parameters<typeof useQueryInstance<IOrder[]>>[2],
) => useQueryInstance<IOrder[]>('orders', () => useIndex('orders'), options);