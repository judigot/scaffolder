import { useQueryInstance } from '@/vendor/useQueryInstance';
import { useFindById } from '@/hooks/shared/useFindById.ts';
import { type ICustomer } from '@/interfaces/ICustomer';

export const useFindByIdCustomer = (
  id: number | string,
  options?: Parameters<typeof useQueryInstance<ICustomer>>[2],
) =>
  useQueryInstance<ICustomer>(
    ['customer', id],
    () => useFindById<ICustomer>('/customers', id),
    options,
  );