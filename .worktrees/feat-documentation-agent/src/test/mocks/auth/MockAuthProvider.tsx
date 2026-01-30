/**
 * MockAuthProvider
 * Replaces Auth0Provider for testing purposes
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { IMockAuthConfig, IMockUser, IMockUserMetadata } from "./types.ts";
import { authenticatedUserConfig } from "../../fixtures/users.ts";

// =============================================================================
// CONTEXT
// =============================================================================

interface IMockAuthContextValue {
	// Auth0-like properties
	user: IMockUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: Error | null;

	// Token
	accessToken: string | null;
	getAccessTokenSilently: () => Promise<string>;

	// Metadata (custom extension)
	userMetadata: IMockUserMetadata | null;

	// Actions
	loginWithRedirect: () => Promise<void>;
	logout: () => void;
}

const MockAuthContext = createContext<IMockAuthContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface IMockAuthProviderProps {
	children: ReactNode;
	config?: IMockAuthConfig;
}

export function MockAuthProvider({
	children,
	config = authenticatedUserConfig,
}: IMockAuthProviderProps) {
	const value = useMemo<IMockAuthContextValue>(
		() => ({
			user: config.user ?? null,
			isAuthenticated: config.isAuthenticated ?? false,
			isLoading: config.isLoading ?? false,
			error: config.error ?? null,
			accessToken: config.accessToken ?? null,
			userMetadata: config.userMetadata ?? null,

			getAccessTokenSilently: () => {
				if (config.accessToken === null || config.accessToken === undefined) {
					return Promise.reject(new Error("No access token available"));
				}
				return Promise.resolve(config.accessToken);
			},

			loginWithRedirect: () => {
				// Mock login - no actual redirect needed in test
				return Promise.resolve();
			},

			logout: () => {
				// Mock logout - no actual action needed in test
			},
		}),
		[config],
	);

	return (
		<MockAuthContext.Provider value={value}>
			{children}
		</MockAuthContext.Provider>
	);
}

// =============================================================================
// HOOKS
// =============================================================================

/** Mock useAuth0 hook */
export function useMockAuth0() {
	const context = useContext(MockAuthContext);
	if (!context) {
		throw new Error("useMockAuth0 must be used within MockAuthProvider");
	}
	return context;
}

/** Mock useUser hook - matches real hook signature */
export function useMockUser() {
	const auth = useMockAuth0();

	return {
		user: auth.user,
		userMetadata: auth.userMetadata,
		githubToken: auth.userMetadata?.github_token ?? null,
		isLoading: auth.isLoading,
		isAuthenticated: auth.isAuthenticated,
		error: auth.error,
		accessToken: auth.accessToken,
		logout: auth.logout,
		refreshGitHubToken: async () => {
			// Mock refresh - no actual action needed in test
		},
		encryptionAvailable: true,
		isTokenEncrypted: false,
		serverConfigStatus: {
			hasEncryptionKey: true,
			hasAuth0Config: true,
		},
	};
}

/** Mock useDecryptedUserMetadata hook */
export function useMockDecryptedUserMetadata() {
	const auth = useMockAuth0();

	return {
		decryptedMetadata: auth.userMetadata,
		isDecrypting: false,
		decryptionError: null,
	};
}

// =============================================================================
// GLOBAL MOCK STATE (for injection)
// =============================================================================

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

/** Check if we're in mock auth mode */
export function isMockAuthEnabled(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return hasMockAuth(window) || import.meta.env.VITE_MOCK_AUTH === "true";
}

/** Get mock auth config from window */
export function getMockAuthConfig(): IMockAuthConfig | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	if (!hasMockAuth(window)) {
		return undefined;
	}
	return window.__MOCK_AUTH__;
}
