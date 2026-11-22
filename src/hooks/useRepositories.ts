import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser.ts";
import { authFetch } from "@/lib/api/authFetch.ts";
import { toUserMessage } from "@/lib/auth/authErrors.ts";

export interface IStoredRepository {
	repoUrl: string;
	addedAt: string;
	localPath?: string;
	defaultBranch?: string;
	authType?: "public" | "github-token";
}

interface IUseRepositoriesResult {
	repositories: IStoredRepository[];
	isLoading: boolean;
	error: string | null;
	addRepository: (repo: Omit<IStoredRepository, "addedAt">) => Promise<boolean>;
	removeRepository: (repoUrl: string) => Promise<boolean>;
	refreshRepositories: () => void;
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
 * Type guard for stored repository
 */
const isStoredRepository = (repo: unknown): repo is IStoredRepository => {
	if (typeof repo !== "object" || repo === null) {
		return false;
	}
	if (!hasProperty(repo, "repoUrl") || !hasProperty(repo, "addedAt")) {
		return false;
	}
	return typeof repo.repoUrl === "string" && typeof repo.addedAt === "string";
};

/**
 * Hook for managing user repositories stored in Auth0 user_metadata
 */
export function useRepositories(): IUseRepositoriesResult {
	const { userMetadata } = useUser();
	const [repositories, setRepositories] = useState<IStoredRepository[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Extract repositories from user metadata
	useEffect(() => {
		if (
			userMetadata !== null &&
			typeof userMetadata === "object" &&
			"repositories" in userMetadata
		) {
			const storedRepos = userMetadata.repositories;
			if (Array.isArray(storedRepos)) {
				const validRepos = storedRepos.filter(isStoredRepository);
				setRepositories(validRepos);
			}
		}
		setIsLoading(false);
	}, [userMetadata]);

	const saveRepositories = useCallback(
		async (repos: IStoredRepository[]): Promise<boolean> => {
			try {
				await authFetch("/user-metadata/repositories", {
					method: "POST",
					json: { repositories: repos },
					errorMessage: "Failed to save repositories",
				});
				setRepositories(repos);
				setError(null);
				return true;
			} catch (err) {
				setError(toUserMessage(err, "Failed to save repositories"));
				return false;
			}
		},
		[],
	);

	const addRepository = useCallback(
		async (repo: Omit<IStoredRepository, "addedAt">): Promise<boolean> => {
			// Check if already exists
			if (
				repositories.some(
					(r) => r.repoUrl.toLowerCase() === repo.repoUrl.toLowerCase(),
				)
			) {
				setError("Repository already exists");
				return false;
			}

			const newRepo: IStoredRepository = {
				repoUrl: repo.repoUrl,
				addedAt: new Date().toISOString(),
				localPath: repo.localPath,
				defaultBranch: repo.defaultBranch,
				authType: repo.authType,
			};

			const updatedRepos = [...repositories, newRepo];
			return saveRepositories(updatedRepos);
		},
		[repositories, saveRepositories],
	);

	const removeRepository = useCallback(
		async (repoUrl: string): Promise<boolean> => {
			const updatedRepos = repositories.filter(
				(r) => r.repoUrl.toLowerCase() !== repoUrl.toLowerCase(),
			);
			return saveRepositories(updatedRepos);
		},
		[repositories, saveRepositories],
	);

	const refreshRepositories = useCallback(() => {
		// Force re-read from userMetadata
		if (
			userMetadata !== null &&
			typeof userMetadata === "object" &&
			"repositories" in userMetadata
		) {
			const storedRepos = userMetadata.repositories;
			if (Array.isArray(storedRepos)) {
				const validRepos = storedRepos.filter(isStoredRepository);
				setRepositories(validRepos);
			}
		}
	}, [userMetadata]);

	return {
		repositories,
		isLoading,
		error,
		addRepository,
		removeRepository,
		refreshRepositories,
	};
}
