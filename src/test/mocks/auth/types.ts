/**
 * Mock Authentication Types
 * Mirrors Auth0 structure for testing
 */

/** Mock Auth0 user structure */
export interface IMockUser {
	sub: string;
	email: string;
	name: string;
	picture: string;
	email_verified: boolean;
	updated_at: string;
}

/** Workspace mode */
export type MockWorkspaceMode = "vcs" | "api";

/** Mock infrastructure credentials */
export interface IMockInfraCredentials {
	sshPublicKey: string;
	sshPrivateKey: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsSessionToken?: string;
	tfcToken: string;
	tfcOrg: string;
	tfcWorkspace: string;
	tfcWorkspaces?: string[];
}

/** Mock workspace creation request */
export interface IMockWorkspaceCreateRequest {
	tfcToken: string;
	tfcOrg: string;
	workspaceName: string;
	mode: MockWorkspaceMode;
	ec2InstanceType?: string;
	rdsInstanceClass?: string;
}

/** Mock workspace creation response */
export interface IMockWorkspaceCreateResponse {
	success: boolean;
	workspace: {
		id: string;
		name: string;
	};
	mode: MockWorkspaceMode;
	ec2InstanceType?: string | null;
	rdsInstanceClass?: string | null;
}

/** Mock user metadata (matches Auth0 user_metadata) */
export interface IMockUserMetadata {
	env?: Record<string, string>;
	infra?: IMockInfraCredentials;
	github_token?: string;
}

/** Mock access token response */
export interface IMockAccessToken {
	token: string;
	expiresIn: number;
	tokenType: string;
}

/** Mock Auth0 context state */
export interface IMockAuthState {
	user: IMockUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: Error | null;
	accessToken: string | null;
}

/** Configuration for MockAuthProvider */
export interface IMockAuthConfig {
	user?: IMockUser | null;
	isAuthenticated?: boolean;
	isLoading?: boolean;
	accessToken?: string | null;
	userMetadata?: IMockUserMetadata | null;
	error?: Error | null;
}

/** Terraform status response */
export interface IMockTerraformStatus {
	status: "applied" | "planning" | "applying" | "errored" | "pending";
	outputs?: {
		dev_ip?: string;
		[key: string]: unknown;
	};
}

/** Terminal command execution response */
export interface IMockCommandResponse {
	success: boolean;
	output: string;
	error?: string;
}

/** Mock Terraform run response */
export interface IMockTerraformRunResponse {
	success: boolean;
	run: {
		id: string;
		status: string;
	};
}
