import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { IFile, IFolder, IStructure } from "@/components/FileViewer.tsx";
import { getApiUrl } from "@/utils/getApiUrl.ts";

interface IFetchRemoteRepoFilesParams {
	repoUrl: string;
	/** Auth token for accessing local-repo API (optional, enables local-first fetching) */
	authToken?: string;
}

interface IErrorResponse {
	message?: string;
	error?: string;
}

/**
 * Helper to safely check if an object has a property
 */
const hasProperty = <K extends string>(
	obj: object,
	key: K,
): obj is object & Record<K, unknown> => {
	return key in obj;
};

/**
 * Type guard for IFile
 */
const isFile = (item: unknown): item is IFile => {
	if (typeof item !== "object" || item === null) {
		return false;
	}
	if (!hasProperty(item, "name") || !hasProperty(item, "type")) {
		return false;
	}
	return typeof item.name === "string" && item.type === "file";
};

/**
 * Type guard for IFolder
 */
const isFolder = (item: unknown): item is IFolder => {
	if (typeof item !== "object" || item === null) {
		return false;
	}
	if (
		!hasProperty(item, "name") ||
		!hasProperty(item, "type") ||
		!hasProperty(item, "children")
	) {
		return false;
	}
	return (
		typeof item.name === "string" &&
		item.type === "folder" &&
		Array.isArray(item.children)
	);
};

/**
 * Type guard for IStructure (array of files and folders)
 */
const isStructure = (data: unknown): data is IStructure => {
	if (!Array.isArray(data)) {
		return false;
	}
	return data.every((item) => isFile(item) || isFolder(item));
};

interface ILocalFilesResponse {
	ok: boolean;
	files?: IStructure;
	source?: "local";
	localPath?: string;
	error?: string;
}

/**
 * Try to fetch files from local clone first
 */
const fetchLocalRepoFiles = async (
	repoUrl: string,
	authToken?: string,
): Promise<{
	files: IStructure;
	source: "local";
	localPath: string;
} | null> => {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (authToken) {
			headers["Authorization"] = `Bearer ${authToken}`;
		}

		const response = await fetch(`${getApiUrl()}/local-repo/files`, {
			method: "POST",
			headers,
			body: JSON.stringify({ repoUrl }),
		});

		if (!response.ok) {
			// 404 means not cloned locally - not an error, just fall back to remote
			if (response.status === 404) {
				return null;
			}
			return null;
		}

		const data: unknown = await response.json();
		const typedData = data as ILocalFilesResponse;

		if (typedData.ok && typedData.files && isStructure(typedData.files)) {
			return {
				files: typedData.files,
				source: "local",
				localPath: typedData.localPath ?? "",
			};
		}

		return null;
	} catch {
		// Local fetch failed, will fall back to remote
		return null;
	}
};

/**
 * Fetch files from remote GitHub (public ZIP archive)
 */
const fetchRemoteRepoFilesOnly = async (
	repoUrl: string,
): Promise<IStructure> => {
	const response = await fetch(`${getApiUrl()}/getUserFilesFromPublicRepo`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ publicRepoURL: repoUrl }),
	});

	if (!response.ok) {
		const errorData: unknown = await response.json();

		const isErrorResponse = (val: unknown): val is IErrorResponse =>
			typeof val === "object" && val !== null && "message" in val;

		let errorMessage = `Failed to fetch repository files: HTTP ${String(response.status)}`;
		if (isErrorResponse(errorData) && typeof errorData.message === "string") {
			errorMessage = errorData.message;
		}

		throw new Error(errorMessage);
	}

	const data: unknown = await response.json();

	if (!isStructure(data)) {
		throw new Error(
			"Invalid response format: expected an array of files and folders",
		);
	}

	return data;
};

/**
 * Fetches files from a GitHub repository.
 * First tries to read from local clone (if available), then falls back to remote.
 */
const fetchRemoteRepoFiles = async (
	params: IFetchRemoteRepoFilesParams & { authToken?: string },
): Promise<IStructure> => {
	if (!params.repoUrl) {
		return [];
	}

	try {
		// Try local clone first (requires auth for the API call)
		const localResult = await fetchLocalRepoFiles(
			params.repoUrl,
			params.authToken,
		);
		if (localResult) {
			console.log(
				`[useRemoteRepoFiles] Using local clone: ${localResult.localPath}`,
			);
			return localResult.files;
		}

		// Fall back to remote
		console.log(`[useRemoteRepoFiles] Fetching from remote: ${params.repoUrl}`);
		return await fetchRemoteRepoFilesOnly(params.repoUrl);
	} catch (error: unknown) {
		if (error instanceof Error) {
			if (error.message === "invalid zip data") {
				throw new Error(
					"Unable to fetch repository. This can happen if: the repository is empty (no commits), it does not exist, it is private, or uses a non-standard default branch. Try cloning the repository locally first.",
				);
			}
			throw new Error(`There was an error: ${error.message}`);
		}
		throw new Error(`Unknown error: ${String(error)}`);
	}
};

/**
 * Hook for fetching files from a GitHub repository.
 * First tries to read from local clone (if available and authToken provided),
 * then falls back to remote GitHub API.
 */
export const useRemoteRepoFiles = (
	params: IFetchRemoteRepoFilesParams,
	behavior?: Omit<UseQueryOptions<IStructure>, "queryKey" | "queryFn">,
): UseQueryResult<IStructure> => {
	return useQuery({
		queryKey: [
			"remoteRepoFiles",
			params.repoUrl,
			params.authToken ? "withAuth" : "noAuth",
		],
		queryFn: () =>
			fetchRemoteRepoFiles({
				repoUrl: params.repoUrl,
				authToken: params.authToken,
			}),
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		refetchOnWindowFocus: false,
		retry: 1,
		...behavior,
	});
};
