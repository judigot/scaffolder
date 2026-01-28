/**
 * Automated tests for Chat Branch Checkout feature
 * Run with: bun run test src/tests/checkout-branch.test.ts
 */

import { afterAll, beforeAll, describe, expect, it as test } from "vitest";

const API_BASE = "http://localhost:3000";
const TEST_REPO_PATH = "/home/ubuntu/scaffolder-workspaces/judigot/ide";

// Get auth token from environment or skip auth tests
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

describe("Chat Branch Checkout", () => {
	// Setup: ensure we're on main and clean
	beforeAll(async () => {
		const { execSync } = await import("child_process");
		try {
			execSync(`cd ${TEST_REPO_PATH} && git checkout main && git clean -fd`, {
				encoding: "utf-8",
			});
		} catch (e) {
			console.warn("Setup warning:", e);
		}
	});

	// Cleanup: return to main
	afterAll(async () => {
		const { execSync } = await import("child_process");
		try {
			execSync(`cd ${TEST_REPO_PATH} && git checkout main`, {
				encoding: "utf-8",
			});
		} catch (e) {
			console.warn("Cleanup warning:", e);
		}
	});

	describe("OpenCode Health", () => {
		test("OpenCode proxy is reachable", async () => {
			const res = await fetch(`${API_BASE}/api/opencode/health`);
			expect(res.ok).toBe(true);

			const data = await res.json();
			expect(data.connected).toBe(true);
		});
	});

	describe("Checkout API", () => {
		test("returns error without auth token", async () => {
			const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					repoPath: TEST_REPO_PATH,
					branch: "main",
				}),
			});

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toContain("authorization");
		});

		test("returns error without repoPath", async () => {
			if (!AUTH_TOKEN) {
				console.log("Skipping: TEST_AUTH_TOKEN not set");
				return;
			}

			const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
				body: JSON.stringify({
					branch: "main",
				}),
			});

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toContain("path");
		});

		test("returns error without branch", async () => {
			if (!AUTH_TOKEN) {
				console.log("Skipping: TEST_AUTH_TOKEN not set");
				return;
			}

			const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
				body: JSON.stringify({
					repoPath: TEST_REPO_PATH,
				}),
			});

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toContain("branch");
		});

		test("successfully checks out existing branch", async () => {
			if (!AUTH_TOKEN) {
				console.log("Skipping: TEST_AUTH_TOKEN not set");
				return;
			}

			const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
				body: JSON.stringify({
					repoPath: TEST_REPO_PATH,
					branch: "main",
				}),
			});

			expect(res.ok).toBe(true);
			const data = await res.json();
			expect(data.ok).toBe(true);
		});

		test("returns error for non-existent branch", async () => {
			if (!AUTH_TOKEN) {
				console.log("Skipping: TEST_AUTH_TOKEN not set");
				return;
			}

			const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
				body: JSON.stringify({
					repoPath: TEST_REPO_PATH,
					branch: "non-existent-branch-xyz",
				}),
			});

			const data = await res.json();
			expect(data.ok).toBe(false);
		});
	});

	describe("Branch Extraction Regex", () => {
		// Test the regex patterns used to extract branch names from agent responses
		const extractBranchFromResponse = (text: string): string | null => {
			const patterns = [
				/git checkout -b ([\w\-/]+)/i,
				/Branch:\s*([\w\-/]+)/i,
				/created branch [`'"]?([\w\-/]+)[`'"]?/i,
				/switched to.*branch [`'"]?([\w\-/]+)[`'"]?/i,
			];

			for (const pattern of patterns) {
				const match = pattern.exec(text);
				if (match?.[1] && match[1] !== "main" && match[1] !== "master") {
					return match[1];
				}
			}
			return null;
		};

		test("extracts branch from 'git checkout -b' command", () => {
			const text = "Running: git checkout -b feat/add-file1";
			expect(extractBranchFromResponse(text)).toBe("feat/add-file1");
		});

		test("extracts branch from 'Branch:' format", () => {
			const text = "✓ Branch: feat/add-dark-mode\n✓ Files: 2 modified";
			expect(extractBranchFromResponse(text)).toBe("feat/add-dark-mode");
		});

		test("extracts branch from 'created branch' format", () => {
			const text = "I've created branch `fix/login-bug` and made the changes.";
			expect(extractBranchFromResponse(text)).toBe("fix/login-bug");
		});

		test("extracts branch from 'switched to branch' format", () => {
			const text = "Switched to a new branch 'refactor/api-client'";
			expect(extractBranchFromResponse(text)).toBe("refactor/api-client");
		});

		test("ignores main branch", () => {
			const text = "git checkout -b main";
			expect(extractBranchFromResponse(text)).toBe(null);
		});

		test("ignores master branch", () => {
			const text = "Branch: master";
			expect(extractBranchFromResponse(text)).toBe(null);
		});

		test("returns null for no branch pattern", () => {
			const text = "I've made some changes to the code.";
			expect(extractBranchFromResponse(text)).toBe(null);
		});
	});
});

describe("Git Operations", () => {
	test("can get current branch", async () => {
		const { execSync } = await import("child_process");
		const branch = execSync(
			`cd ${TEST_REPO_PATH} && git branch --show-current`,
			{
				encoding: "utf-8",
			},
		).trim();

		expect(branch).toBeTruthy();
		expect(typeof branch).toBe("string");
	});

	test("can list all branches", async () => {
		const { execSync } = await import("child_process");
		const branches = execSync(`cd ${TEST_REPO_PATH} && git branch -a`, {
			encoding: "utf-8",
		});

		expect(branches).toContain("main");
	});
});
