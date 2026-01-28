import { useAuth0 } from "@auth0/auth0-react";
import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { IStructure } from "@/components/FileViewer.tsx";

interface UseLocalRepoFilesParams {
	localPath?: string;
}

/**
 * Hook for fetching files from a locally cloned repository
 */
export function useLocalRepoFiles(
	params: UseLocalRepoFilesParams,
	options?: Omit<UseQueryOptions<IStructure>, "queryKey" | "queryFn">,
): UseQueryResult<IStructure> {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	return useQuery({
		queryKey: ["localRepoFiles", params.localPath],
		queryFn: async (): Promise<IStructure> => {
			if (!params.localPath || !isAuthenticated) {
				return [];
			}

			const token = await getAccessTokenSilently();
			const response = await fetch("/api/local-repo/files", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ repoPath: params.localPath }),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.error || "Failed to fetch local repo files");
			}

			const data = await response.json();
			return data.files || [];
		},
		enabled: !!params.localPath && isAuthenticated,
		staleTime: 0, // Always refetch when invalidated
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		...options,
	});
}
