import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomer } from '@/hooks/customer/useIndexCustomer';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { ICustomer } from '@/interfaces/ICustomer';

export const Route = createFileRoute('/_authenticated/customer')({
  component: CustomerPage,
});

function CustomerPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useCustomer();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/customers', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<ICustomer>) =>
      useUpdate<ICustomer, Partial<ICustomer>>('/customers', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'name', header: 'Name' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<ICustomer>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customer</h1>
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