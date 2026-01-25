/**
 * Playwright Test Fixtures
 * Provides mock authentication and common test utilities
 */

import { test as base, expect } from "@playwright/test";

// Mock user data matching Auth0 structure
const mockUser = {
	sub: "auth0|test-user-123",
	email: "test@example.com",
	name: "Test User",
	nickname: "testuser",
	picture: "https://example.com/avatar.png",
};

// Mock infrastructure credentials
const mockInfraCredentials = {
	sshPublicKey: "ssh-rsa AAAA... test@example.com",
	sshPrivateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBKMock-test-key-for-playwright...
-----END OPENSSH PRIVATE KEY-----`,
	awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
	awsSecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
	awsRegion: "us-east-2",
};

// Mock user metadata
const mockUserMetadata = {
	github_token: "gho_mock_github_token_for_testing",
	env: {
		NODE_ENV: "development",
	},
	infra: mockInfraCredentials,
};

// Extend base test with custom fixtures
export const test = base.extend<{
	authenticatedPage: typeof base.prototype;
	mockTerminalApi: void;
}>({
	// Fixture that sets up authentication state
	authenticatedPage: async ({ page, context }, use) => {
		// Inject mock auth state into localStorage before navigation
		await context.addInitScript(() => {
			// Set mock auth state
			window.__MOCK_AUTH__ = {
				isAuthenticated: true,
				isLoading: false,
				user: {
					sub: "auth0|test-user-123",
					email: "test@example.com",
					name: "Test User",
					nickname: "testuser",
					picture: "https://example.com/avatar.png",
				},
				accessToken: "mock-access-token-for-testing",
				userMetadata: {
					github_token: "gho_mock_github_token_for_testing",
					env: { NODE_ENV: "development" },
					infra: {
						sshPublicKey: "ssh-rsa AAAA... test@example.com",
						sshPrivateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nmock-key\n-----END OPENSSH PRIVATE KEY-----",
						awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
						awsSecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
						awsRegion: "us-east-2",
					},
				},
			};
		});

		await use(page);
	},

	// Fixture that mocks terminal API responses
	mockTerminalApi: async ({ page }, use) => {
		// Intercept terminal API calls
		await page.route("**/api/terminal/execute", async (route) => {
			const request = route.request();
			const body = request.postDataJSON();
			const command = body?.command || "";

			// Simulate command responses
			let response;

			if (command.startsWith("ls")) {
				response = {
					success: true,
					exitCode: 0,
					stdout: ".\n..\n.bashrc\n.ssh\nprojects\ntestfile",
					stderr: "",
				};
			} else if (command.startsWith("pwd")) {
				response = {
					success: true,
					exitCode: 0,
					stdout: "/home/ec2-user",
					stderr: "",
				};
			} else if (command.startsWith("whoami")) {
				response = {
					success: true,
					exitCode: 0,
					stdout: "ec2-user",
					stderr: "",
				};
			} else if (command.startsWith("echo")) {
				const echoContent = command.replace(/^echo\s+/, "").replace(/["']/g, "");
				response = {
					success: true,
					exitCode: 0,
					stdout: echoContent + "\n",
					stderr: "",
				};
			} else if (command.startsWith("touch") || command.startsWith("mkdir")) {
				response = {
					success: true,
					exitCode: 0,
					stdout: "",
					stderr: "",
				};
			} else if (command === "clear") {
				response = {
					success: true,
					exitCode: 0,
					stdout: "",
					stderr: "",
				};
			} else if (command.startsWith("cat /nonexistent")) {
				response = {
					success: false,
					exitCode: 1,
					stdout: "",
					stderr: "cat: /nonexistent: No such file or directory",
				};
			} else {
				// Default success response
				response = {
					success: true,
					exitCode: 0,
					stdout: `Executed: ${command}\n`,
					stderr: "",
				};
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(response),
			});
		});

		// Mock user metadata endpoint
		await page.route("**/api/user-metadata", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					env: mockUserMetadata.env,
					infra: mockUserMetadata.infra,
				}),
			});
		});

		// Mock terraform status
		await page.route("**/api/terraform/status", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					status: "applied",
					outputs: {
						dev_ip: "54.123.45.67",
					},
				}),
			});
		});

		await use();
	},
});

export { expect };

// Re-export for convenience
export { mockUser, mockInfraCredentials, mockUserMetadata };
