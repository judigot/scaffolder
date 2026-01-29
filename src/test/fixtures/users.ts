/**
 * User Test Fixtures
 * Pre-built user scenarios for testing
 */

import type {
	IMockAuthConfig,
	IMockInfraCredentials,
	IMockUser,
	IMockUserMetadata,
} from "../mocks/auth/types.ts";

// =============================================================================
// BASE USER
// =============================================================================

export const mockUser: IMockUser = {
	sub: "auth0|mock_user_12345",
	email: "test@example.com",
	name: "Test User",
	picture: "https://example.com/avatar.png",
	email_verified: true,
	updated_at: new Date().toISOString(),
};

// =============================================================================
// INFRASTRUCTURE CREDENTIALS
// =============================================================================

export const mockInfraCredentials: IMockInfraCredentials = {
	sshPublicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7... test@example.com",
	sshPrivateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAu7vVmK8xMOCK8G5S9qKr7WT4tQ8f5D5mQqR7xLW3FvZ9...
-----END OPENSSH PRIVATE KEY-----`,
	awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
	awsSecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
	awsSessionToken: undefined,
	tfcToken: "mock_tfc_token_abc123",
	tfcOrg: "test-organization",
	tfcWorkspace: "test-workspace",
};

export const mockInfraCredentialsPartial: Partial<IMockInfraCredentials> = {
	sshPublicKey: mockInfraCredentials.sshPublicKey,
	sshPrivateKey: mockInfraCredentials.sshPrivateKey,
	// No AWS or TFC credentials
};

// =============================================================================
// USER METADATA
// =============================================================================

export const mockUserMetadata: IMockUserMetadata = {
	env: {
		DATABASE_URL: "postgresql://localhost:5432/testdb",
		API_KEY: "test_api_key_12345",
	},
	infra: mockInfraCredentials,
	github_token: "ghp_mock_github_token_12345",
};

export const mockUserMetadataEmpty: IMockUserMetadata = {
	env: {},
};

export const mockUserMetadataNoInfra: IMockUserMetadata = {
	env: {
		DATABASE_URL: "postgresql://localhost:5432/testdb",
	},
	github_token: "ghp_mock_github_token_12345",
};

// =============================================================================
// AUTH CONFIGURATIONS (for MockAuthProvider)
// =============================================================================

/** Fully authenticated user with all credentials */
export const authenticatedUserConfig: IMockAuthConfig = {
	user: mockUser,
	isAuthenticated: true,
	isLoading: false,
	accessToken: "mock_access_token_xyz123",
	userMetadata: mockUserMetadata,
	error: null,
};

/** New user - authenticated but no credentials */
export const newUserConfig: IMockAuthConfig = {
	user: mockUser,
	isAuthenticated: true,
	isLoading: false,
	accessToken: "mock_access_token_xyz123",
	userMetadata: mockUserMetadataEmpty,
	error: null,
};

/** User with SSH key but no AWS/TFC */
export const partialInfraUserConfig: IMockAuthConfig = {
	user: mockUser,
	isAuthenticated: true,
	isLoading: false,
	accessToken: "mock_access_token_xyz123",
	userMetadata: {
		...mockUserMetadataNoInfra,
		// eslint-disable-next-line no-type-assertion/no-type-assertion -- Test fixture requires partial type cast
		infra: mockInfraCredentialsPartial as IMockInfraCredentials,
	},
	error: null,
};

/** Loading state */
export const loadingUserConfig: IMockAuthConfig = {
	user: null,
	isAuthenticated: false,
	isLoading: true,
	accessToken: null,
	userMetadata: null,
	error: null,
};

/** Unauthenticated state */
export const unauthenticatedConfig: IMockAuthConfig = {
	user: null,
	isAuthenticated: false,
	isLoading: false,
	accessToken: null,
	userMetadata: null,
	error: null,
};

/** Auth error state */
export const authErrorConfig: IMockAuthConfig = {
	user: null,
	isAuthenticated: false,
	isLoading: false,
	accessToken: null,
	userMetadata: null,
	error: new Error("Authentication failed"),
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/** Create a custom mock user */
export function createMockUser(overrides: Partial<IMockUser> = {}): IMockUser {
	return {
		...mockUser,
		...overrides,
	};
}

/** Create custom mock metadata */
export function createMockMetadata(
	overrides: Partial<IMockUserMetadata> = {},
): IMockUserMetadata {
	return {
		...mockUserMetadata,
		...overrides,
	};
}

/** Create custom auth config */
export function createMockAuthConfig(
	overrides: Partial<IMockAuthConfig> = {},
): IMockAuthConfig {
	return {
		...authenticatedUserConfig,
		...overrides,
	};
}
