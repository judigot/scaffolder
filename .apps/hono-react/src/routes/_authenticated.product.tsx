import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProduct } from '@/hooks/product/useIndexProduct';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IProduct } from '@/interfaces/IProduct';

export const Route = createFileRoute('/_authenticated/product')({
  component: ProductPage,
});

function ProductPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useProduct();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/products', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IProduct>) =>
      useUpdate<IProduct, Partial<IProduct>>('/products', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'productName', header: 'Product Name' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IProduct>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Product</h1>
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
