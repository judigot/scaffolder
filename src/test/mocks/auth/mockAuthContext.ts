/**
 * Mock Auth Context - shared between provider and hooks
 */

import { createContext } from "react";
import type { IMockUser, IMockUserMetadata } from "./types.ts";

export interface IMockAuthContextValue {
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

export const MockAuthContext = createContext<IMockAuthContextValue | null>(
	null,
);
