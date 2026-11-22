import { useQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/lib/api/authFetch.ts';

/** Test helper: a component with one protected query. */
export function MetadataProbe() {
  const query = useQuery({
    queryKey: ['userMetadata', 'probe'],
    queryFn: () => authFetchJson('/user-metadata'),
    staleTime: 0,
  });
  return (
    <div>
      <span data-testid="probe-status">{query.status}</span>
      <span data-testid="probe-data">{JSON.stringify(query.data ?? null)}</span>
    </div>
  );
}
