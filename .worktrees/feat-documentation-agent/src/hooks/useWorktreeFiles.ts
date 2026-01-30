import { useAuth0 } from "@auth0/auth0-react";
import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { IStructure } from "@/components/FileViewer.tsx";

interface UseWorktreeFilesParams {
	worktreePath?: string;
}

/**
 * Hook for fetching files from a worktree
 */
export function useWorktreeFiles(
	params: UseWorktreeFilesParams,
	options?: Omit<UseQueryOptions<IStructure>, "queryKey" | "queryFn">,
): UseQueryResult<IStructure> {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	return useQuery({
		queryKey: ["worktreeFiles", params.worktreePath],
		queryFn: async (): Promise<IStructure> => {
			if (!params.worktreePath || !isAuthenticated) {
				return [];
			}

			const token = await getAccessTokenSilently();
			const response = await fetch("/api/worktree/files", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ worktreePath: params.worktreePath }),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.error || "Failed to fetch worktree files");
			}

			const data = await response.json();
			return data.files || [];
		},
		enabled: !!params.worktreePath && isAuthenticated,
		staleTime: 0, // Always refetch when invalidated
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		...options,
	});
}
