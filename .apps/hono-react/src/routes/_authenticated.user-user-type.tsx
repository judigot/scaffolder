import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserUserType } from '@/hooks/user-user-type/useIndexUserUserType';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IUserUserType } from '@/interfaces/IUserUserType';

export const Route = createFileRoute('/_authenticated/user-user-type')({
  component: UserUserTypePage,
});

function UserUserTypePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useUserUserType();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/userUserTypes', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IUserUserType>) =>
      useUpdate<IUserUserType, Partial<IUserUserType>>(
        '/userUserTypes',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'userId', header: 'User Id' },
    { accessorKey: 'userTypeId', header: 'User Type Id' },
    { accessorKey: 'createdAt', header: 'Created At' },
    { accessorKey: 'updatedAt', header: 'Updated At' },
    { accessorKey: 'deletedAt', header: 'Deleted At' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this userUserType?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IUserUserType>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User User Type</h1>
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
