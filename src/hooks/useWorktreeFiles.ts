import { useAuth0 } from "@auth0/auth0-react";
import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { IStructure } from "@/components/FileViewer.tsx";

interface IUseWorktreeFilesParams {
	worktreePath?: string;
}

interface IWorktreeFilesResponse {
	files?: IStructure;
	error?: string;
}

/**
 * Hook for fetching files from a worktree
 */
export function useWorktreeFiles(
	params: IUseWorktreeFilesParams,
	options?: Omit<UseQueryOptions<IStructure>, "queryKey" | "queryFn">,
): UseQueryResult<IStructure> {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	return useQuery({
		queryKey: ["worktreeFiles", params.worktreePath],
		queryFn: async (): Promise<IStructure> => {
			if (
				params.worktreePath === undefined ||
				params.worktreePath === "" ||
				!isAuthenticated
			) {
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
				const errorJson: unknown = await response.json().catch(() => ({}));
				const isErrorResponse = (val: unknown): val is IWorktreeFilesResponse =>
					typeof val === "object" && val !== null;
				const errorData: IWorktreeFilesResponse = isErrorResponse(errorJson)
					? errorJson
					: {};
				const errorMessage =
					errorData.error ?? "Failed to fetch worktree files";
				throw new Error(errorMessage);
			}

			const dataJson: unknown = await response.json();
			const isFilesResponse = (val: unknown): val is IWorktreeFilesResponse =>
				typeof val === "object" && val !== null;
			const data: IWorktreeFilesResponse = isFilesResponse(dataJson)
				? dataJson
				: {};
			return data.files ?? [];
		},
		enabled:
			params.worktreePath !== undefined &&
			params.worktreePath !== "" &&
			isAuthenticated,
		staleTime: 0, // Always refetch when invalidated
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		...options,
	});
}
