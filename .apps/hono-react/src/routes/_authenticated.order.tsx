import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrder } from '@/hooks/order/useIndexOrder';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IOrder } from '@/interfaces/IOrder';

export const Route = createFileRoute('/_authenticated/order')({
  component: OrderPage,
});

function OrderPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useOrder();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/orders', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number | string } & Partial<IOrder>) =>
      useUpdate<IOrder, Partial<IOrder>>('/orders', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'customerId', header: 'Customer Id' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IOrder>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Order</h1>
      <DataTable
        data={data ?? []}
        columns={columns}
        isLoading={isLoading}
        onSearch={() => refetch()}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
