import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrderProduct } from '@/hooks/order-product/useIndexOrderProduct';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IOrderProduct } from '@/interfaces/IOrderProduct';

export const Route = createFileRoute('/_authenticated/order-product')({
  component: OrderProductPage,
});

function OrderProductPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useOrderProduct();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/orderProducts', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IOrderProduct>) =>
      useUpdate<IOrderProduct, Partial<IOrderProduct>>(
        '/orderProducts',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'orderId', header: 'Order Id' },
    { accessorKey: 'productId', header: 'Product Id' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this orderProduct?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IOrderProduct>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Order Product</h1>
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
