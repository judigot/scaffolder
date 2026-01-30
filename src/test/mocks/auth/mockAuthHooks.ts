/**
 * Mock Auth Hooks
 * Hooks for accessing mock auth context in tests
 */

import { useContext } from "react";
import { MockAuthContext } from "./mockAuthContext.ts";

/** Mock useAuth0 hook */
export function useMockAuth0() {
	const context = useContext(MockAuthContext);
	if (context === null) {
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
