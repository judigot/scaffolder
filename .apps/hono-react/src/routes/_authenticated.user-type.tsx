import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserType } from '@/hooks/user-type/useIndexUserType';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IUserType } from '@/interfaces/IUserType';

export const Route = createFileRoute('/_authenticated/user-type')({
  component: UserTypePage,
});

function UserTypePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useUserType();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/userTypes', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IUserType>) =>
      useUpdate<IUserType, Partial<IUserType>>('/userTypes', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'createdAt', header: 'Created At' },
    { accessorKey: 'updatedAt', header: 'Updated At' },
    { accessorKey: 'deletedAt', header: 'Deleted At' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this userType?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IUserType>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Type</h1>
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
