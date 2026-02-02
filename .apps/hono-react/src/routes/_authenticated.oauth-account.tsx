import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOauthAccount } from '@/hooks/oauth-account/useIndexOauthAccount';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IOauthAccount } from '@/interfaces/IOauthAccount';

export const Route = createFileRoute('/_authenticated/oauth-account')({
  component: OauthAccountPage,
});

function OauthAccountPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useOauthAccount();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/oauthAccounts', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number | string } & Partial<IOauthAccount>) =>
      useUpdate<IOauthAccount, Partial<IOauthAccount>>(
        '/oauthAccounts',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'providerId', header: 'Provider Id' },
    { accessorKey: 'providerUserId', header: 'Provider User Id' },
    { accessorKey: 'userId', header: 'User Id' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this oauthAccount?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IOauthAccount>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Oauth Account</h1>
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
