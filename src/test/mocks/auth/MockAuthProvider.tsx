/**
 * MockAuthProvider
 * Replaces Auth0Provider for testing purposes
 */

import { useMemo, type ReactNode } from "react";
import type { IMockAuthConfig } from "./types.ts";
import { authenticatedUserConfig } from "../../fixtures/users.ts";
import {
	MockAuthContext,
	type IMockAuthContextValue,
} from "./mockAuthContext.ts";

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
