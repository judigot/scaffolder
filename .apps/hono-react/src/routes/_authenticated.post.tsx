import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePost } from '@/hooks/post/useIndexPost';
import { deleteResource } from '@/hooks/shared/useDestroy';
import { useUpdate } from '@/hooks/shared/useUpdate';
import DataTable from '@/components/DataTable';
import type { IPost } from '@/interfaces/IPost';

export const Route = createFileRoute('/_authenticated/post')({
  component: PostPage,
});

function PostPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = usePost();

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource('/posts', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number | string } & Partial<IPost>) =>
      useUpdate<IPost, Partial<IPost>>('/posts', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const columns = [
    { accessorKey: 'id', header: 'Id' },
    { accessorKey: 'userId', header: 'User Id' },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'content', header: 'Content' },
    { accessorKey: 'createdAt', header: 'Created At' },
    { accessorKey: 'updatedAt', header: 'Updated At' },
  ];

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = (id: number | string, data: Partial<IPost>) => {
    updateMutation.mutate({ id, ...data });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Posts</h1>
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