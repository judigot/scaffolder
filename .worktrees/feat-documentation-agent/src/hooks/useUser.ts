import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { IMockAuthConfig } from "@/test/mocks/auth/types.ts";
import { useUserStore } from "@/useUserStore.ts";

interface IServerConfigStatus {
	auth0ManagementApiConfigured?: boolean;
}

interface IUserMetadataResponse {
	success?: boolean;
	metadata?: Record<string, unknown> | null;
	serverConfigStatus?: IServerConfigStatus;
}

interface ITokenResponse {
	success?: boolean;
	token?: string | null;
	encryptionAvailable?: boolean;
	isTokenEncrypted?: boolean | null;
	serverConfigStatus?: IServerConfigStatus;
	error?: string;
	message?: string;
	code?: string;
}

interface IUser {
	sub?: string;
	email?: string;
	name?: string;
	picture?: string;
	[key: string]: unknown;
}

interface IUseUserReturn {
	user: IUser | null;
	userMetadata: Record<string, unknown> | null;
	githubToken: string | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: Error | null;
	accessToken: string | null;
	logout: () => void;
	refreshGitHubToken: () => Promise<void>;
	encryptionAvailable: boolean;
	isTokenEncrypted: boolean | null;
	serverConfigStatus: IServerConfigStatus | null;
}

const isMetadataResponse = (val: unknown): val is IUserMetadataResponse => {
	return (
		typeof val === "object" &&
		val !== null &&
		("success" in val || "metadata" in val)
	);
};

const isTokenResponse = (val: unknown): val is ITokenResponse => {
	return (
		typeof val === "object" &&
		val !== null &&
		("success" in val || "token" in val)
	);
};

import { getApiUrl } from "@/utils/getApiUrl.ts";

/**
 * Type predicate to check if window has mock auth config
 */
const hasMockAuth = (
	win: Window,
): win is Window & { __MOCK_AUTH__: IMockAuthConfig } => {
	return (
		"__MOCK_AUTH__" in win &&
		typeof win.__MOCK_AUTH__ === "object" &&
		win.__MOCK_AUTH__ !== null
	);
};

/**
 * Get mock auth configuration from window if available
 * Returns null if not in mock auth mode
 */
const getMockAuth = (): IMockAuthConfig | null => {
	if (typeof window === "undefined") {
		return null;
	}
	if (!hasMockAuth(window)) {
		return null;
	}
	if (window.__MOCK_AUTH__.isAuthenticated === true) {
		return window.__MOCK_AUTH__;
	}
	return null;
};

const fetchUserMetadata = async (
	accessToken: string,
): Promise<{
	metadata: Record<string, unknown> | null;
	serverConfigStatus: IServerConfigStatus | null;
}> => {
	const response = await fetch(`${getApiUrl()}/user-metadata`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		return { metadata: null, serverConfigStatus: null };
	}

	const result: unknown = await response.json();

	if (isMetadataResponse(result)) {
		return {
			metadata: result.metadata ?? null,
			serverConfigStatus: result.serverConfigStatus ?? null,
		};
	}

	return { metadata: null, serverConfigStatus: null };
};

const fetchGitHubToken = async (
	accessToken: string,
): Promise<{
	token: string | null;
	encryptionAvailable: boolean;
	isTokenEncrypted: boolean | null;
	serverConfigStatus: IServerConfigStatus | null;
}> => {
	const response = await fetch(`${getApiUrl()}/github-token`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		return {
			token: null,
			encryptionAvailable: false,
			isTokenEncrypted: null,
			serverConfigStatus: null,
		};
	}

	const result: unknown = await response.json();

	if (isTokenResponse(result)) {
		return {
			token: result.token ?? null,
			encryptionAvailable: result.encryptionAvailable ?? false,
			isTokenEncrypted: result.isTokenEncrypted ?? null,
			serverConfigStatus: result.serverConfigStatus ?? null,
		};
	}

	return {
		token: null,
		encryptionAvailable: false,
		isTokenEncrypted: null,
		serverConfigStatus: null,
	};
};

export const useUser = (): IUseUserReturn => {
	const mockAuth = getMockAuth();
	const {
		user: auth0User,
		isAuthenticated: auth0IsAuthenticated,
		isLoading: auth0Loading,
		getAccessTokenSilently,
		error: auth0Error,
		logout: auth0Logout,
	} = useAuth0();

	const isAuthenticated = auth0IsAuthenticated || mockAuth !== null;
	const user = mockAuth?.user ?? auth0User ?? null;

	const {
		setUser,
		setAccessToken,
		setUserMetadata,
		setGithubToken,
		userMetadata,
		githubToken,
	} = useUserStore();

	const getAccessToken = async (): Promise<string | null> => {
		if (mockAuth?.accessToken !== undefined && mockAuth.accessToken !== null) {
			setAccessToken(mockAuth.accessToken);
			return mockAuth.accessToken;
		}

		if (!isAuthenticated || user?.sub === undefined || user.sub === "") {
			return null;
		}

		const audienceEnv: unknown = import.meta.env.VITE_AUTH0_AUDIENCE;
		if (typeof audienceEnv !== "string" || audienceEnv === "") {
			throw new Error("Auth0 audience is not configured");
		}
		const audience: string = audienceEnv;

		const accessToken = await getAccessTokenSilently({
			authorizationParams: {
				audience,
			},
			cacheMode: "on",
		});

		if (typeof accessToken !== "string" || accessToken === "") {
			return null;
		}

		setAccessToken(accessToken);
		return accessToken;
	};

	const {
		data: metadataResult,
		isLoading: metadataLoading,
		error: metadataError,
	} = useQuery({
		queryKey: ["userMetadata", user?.sub],
		queryFn: async () => {
			if (mockAuth?.userMetadata) {
				const metadata = mockAuth.userMetadata;
				setUserMetadata(metadata);
				return { metadata, serverConfigStatus: null };
			}

			const accessToken = await getAccessToken();
			if (accessToken === null) {
				return { metadata: null, serverConfigStatus: null };
			}

			const result = await fetchUserMetadata(accessToken);
			setUserMetadata(result.metadata);
			return result;
		},
		enabled: isAuthenticated && user?.sub !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: false,
	});

	const {
		data: tokenData,
		isLoading: tokenLoading,
		error: tokenError,
		refetch: refetchToken,
	} = useQuery({
		queryKey: ["githubToken", user?.sub],
		queryFn: async () => {
			if (mockAuth?.userMetadata) {
				const token =
					typeof mockAuth.userMetadata.github_token === "string"
						? mockAuth.userMetadata.github_token
						: null;
				setGithubToken(token);
				return {
					token,
					encryptionAvailable: true,
					isTokenEncrypted: false,
					serverConfigStatus: null,
				};
			}

			const accessToken = await getAccessToken();
			if (accessToken === null) {
				return {
					token: null,
					encryptionAvailable: false,
					isTokenEncrypted: null,
					serverConfigStatus: null,
				};
			}

			const fetchedData = await fetchGitHubToken(accessToken);
			setGithubToken(fetchedData.token);
			return fetchedData;
		},
		enabled: isAuthenticated && user?.sub !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: false,
	});

	useEffect(() => {
		if (user) {
			setUser(user);
		}
	}, [user, setUser]);

	const refreshGitHubToken = async (): Promise<void> => {
		await refetchToken();
	};

	const logout = (): void => {
		void auth0Logout({
			logoutParams: { returnTo: window.location.origin },
		});
	};

	const isLoading =
		(mockAuth === null && auth0Loading) || metadataLoading || tokenLoading;
	const error =
		mockAuth !== null
			? null
			: (auth0Error ?? metadataError ?? tokenError ?? null);

	const serverConfigStatus =
		tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus ?? null;

	return {
		user,
		userMetadata: metadataResult?.metadata ?? userMetadata,
		githubToken: tokenData?.token ?? githubToken,
		isLoading,
		isAuthenticated,
		error: error instanceof Error ? error : null,
		accessToken: mockAuth?.accessToken ?? useUserStore.getState().accessToken,
		logout,
		refreshGitHubToken,
		encryptionAvailable: tokenData?.encryptionAvailable ?? false,
		isTokenEncrypted: tokenData?.isTokenEncrypted ?? null,
		serverConfigStatus,
	};
};
