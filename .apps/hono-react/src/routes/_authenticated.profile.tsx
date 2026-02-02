import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/profile/useIndexProfile';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IProfile } from '@/interfaces/IProfile';

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useProfile();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/profiles', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IProfile>) =>
      useUpdate<IProfile, Partial<IProfile>>('/profiles', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'userId', header: 'User Id' },
    { accessorKey: 'bio', header: 'Bio' },
    { accessorKey: 'createdAt', header: 'Created At' },
    { accessorKey: 'updatedAt', header: 'Updated At' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IProfile>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
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