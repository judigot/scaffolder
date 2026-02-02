import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useIndex } from '@/hooks/shared/useIndex.ts';
import { type ICustomer } from '@/interfaces/ICustomer';

export const useCustomer = (
  options?: Parameters<typeof useQueryInstance<ICustomer[]>>[2],
) =>
  useQueryInstance<ICustomer[]>(
    'customers',
    () => useIndex('customers'),
    options,
  );