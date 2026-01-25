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

			getAccessTokenSilently: async () => {
				if (!config.accessToken) {
					throw new Error("No access token available");
				}
				return config.accessToken;
			},

			loginWithRedirect: async () => {
				console.log("[MockAuth] loginWithRedirect called");
			},

			logout: () => {
				console.log("[MockAuth] logout called");
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
		userMetadata: auth.userMetadata as Record<string, unknown> | null,
		githubToken: auth.userMetadata?.github_token ?? null,
		isLoading: auth.isLoading,
		isAuthenticated: auth.isAuthenticated,
		error: auth.error,
		accessToken: auth.accessToken,
		logout: auth.logout,
		refreshGitHubToken: async () => {
			console.log("[MockAuth] refreshGitHubToken called");
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
		decryptedMetadata: auth.userMetadata as Record<string, unknown> | null,
		isDecrypting: false,
		decryptionError: null,
	};
}

// =============================================================================
// GLOBAL MOCK STATE (for injection)
// =============================================================================

declare global {
	interface Window {
		__MOCK_AUTH__?: IMockAuthConfig;
	}
}

/** Check if we're in mock auth mode */
export function isMockAuthEnabled(): boolean {
	return (
		typeof window !== "undefined" &&
		(window.__MOCK_AUTH__ !== undefined ||
			import.meta.env.VITE_MOCK_AUTH === "true")
	);
}

/** Get mock auth config from window */
export function getMockAuthConfig(): IMockAuthConfig | undefined {
	if (typeof window !== "undefined") {
		return window.__MOCK_AUTH__;
	}
	return undefined;
}
