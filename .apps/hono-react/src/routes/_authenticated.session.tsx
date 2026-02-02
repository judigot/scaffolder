import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/session/useIndexSession';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { ISession } from '@/interfaces/ISession';

export const Route = createFileRoute('/_authenticated/session')({
  component: SessionPage,
});

function SessionPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useSession();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/sessions', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<ISession>) =>
      useUpdate<ISession, Partial<ISession>>('/sessions', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'userId', header: 'User Id' },
    { accessorKey: 'expiresAt', header: 'Expires At' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<ISession>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Session</h1>
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
