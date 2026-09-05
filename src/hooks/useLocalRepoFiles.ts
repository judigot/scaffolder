import { useAuth0 } from "@auth0/auth0-react";
import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { IStructure } from "@/components/FileViewer.tsx";

interface IUseLocalRepoFilesParams {
	localPath?: string;
}

interface ILocalRepoFilesResponse {
	files?: IStructure;
	error?: string;
}

/**
 * Hook for fetching files from a locally cloned repository
 */
export function useLocalRepoFiles(
	params: IUseLocalRepoFilesParams,
	options?: Omit<UseQueryOptions<IStructure>, "queryKey" | "queryFn">,
): UseQueryResult<IStructure> {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	return useQuery({
		queryKey: ["localRepoFiles", params.localPath],
		queryFn: async (): Promise<IStructure> => {
			if (
				params.localPath === undefined ||
				params.localPath === "" ||
				!isAuthenticated
			) {
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
				const errorJson: unknown = await response.json().catch(() => ({}));
				const isErrorResponse = (
					val: unknown,
				): val is ILocalRepoFilesResponse =>
					typeof val === "object" && val !== null;
				const errorData: ILocalRepoFilesResponse = isErrorResponse(errorJson)
					? errorJson
					: {};
				const errorMessage =
					errorData.error ?? "Failed to fetch local repo files";
				throw new Error(errorMessage);
			}

			const dataJson: unknown = await response.json();
			const isFilesResponse = (val: unknown): val is ILocalRepoFilesResponse =>
				typeof val === "object" && val !== null;
			const data: ILocalRepoFilesResponse = isFilesResponse(dataJson)
				? dataJson
				: {};
			return data.files ?? [];
		},
		enabled:
			params.localPath !== undefined &&
			params.localPath !== "" &&
			isAuthenticated,
		staleTime: 0, // Always refetch when invalidated
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		...options,
	});
}
