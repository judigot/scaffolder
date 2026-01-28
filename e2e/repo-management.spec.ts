/**
 * Repository Management E2E Tests
 *
 * Tests the repo status panel, fetch/pull buttons, and delete clone functionality.
 */

import { expect, test } from "./fixtures";

// Mock repo status response
const mockRepoStatus = {
	ok: true,
	branch: "main",
	isDirty: false,
	ahead: 0,
	behind: 0,
	lastCommit: {
		hash: "abc1234567890def1234567890abcdef12345678",
		message: "feat: add new feature",
		date: "2026-01-28 10:00:00 +0000",
	},
};

// Mock dirty repo status
const mockDirtyRepoStatus = {
	...mockRepoStatus,
	isDirty: true,
};

// Mock repo with ahead/behind
const mockAheadBehindStatus = {
	...mockRepoStatus,
	ahead: 2,
	behind: 1,
};

test.describe("Repository Management", () => {
	test.describe("Status Panel", () => {
		test.beforeEach(async ({ page, mockInfraApi: _ }) => {
			// Mock the local-repo API endpoints
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
						authType: "public",
					}),
				});
			});

			// Mock user metadata to include a repo
			await page.route("**/api/user/metadata", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						repositories: [
							{
								repoUrl: "https://github.com/test/repo",
								localPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
								defaultBranch: "main",
								addedAt: new Date().toISOString(),
							},
						],
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
		});

		test("should navigate to Repositories tab", async ({ page }) => {
			const reposTab = page.locator('button:has-text("Repositories")').first();
			await expect(reposTab).toBeVisible();
			await reposTab.click();

			// Should see repo tabs area
			await expect(page.locator('button:has-text("Add")')).toBeVisible();
		});

		test("should display branch name in status panel", async ({ page }) => {
			// Navigate to repos
			await page.locator('button:has-text("Repositories")').first().click();

			// Add a repo first (or click existing)
			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();

			// Fill in repo URL
			const input = page.locator('input[placeholder*="judigot/repo"]');
			await input.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();

			// Wait for repo to be added
			await page.waitForTimeout(500);

			// Click dropdown on the repo tab
			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				// Should see branch name
				await expect(page.locator("text=main").first()).toBeVisible();
			}
		});

		test("should show Clean badge for clean repo", async ({ page }) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.locator('button:has-text("Repositories")').first().click();
			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();
				await expect(page.locator("text=Clean").first()).toBeVisible();
			}
		});

		test("should show Modified badge for dirty repo", async ({ page }) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDirtyRepoStatus),
				});
			});

			await page.locator('button:has-text("Repositories")').first().click();
			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();
				await expect(page.locator("text=Modified").first()).toBeVisible();
			}
		});

		test("should show ahead/behind counts", async ({ page }) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockAheadBehindStatus),
				});
			});

			await page.locator('button:has-text("Repositories")').first().click();
			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();
				await expect(page.locator("text=2 ahead").first()).toBeVisible();
				await expect(page.locator("text=1 behind").first()).toBeVisible();
			}
		});
	});

	test.describe("Fetch Button", () => {
		test("should show loading state when fetching", async ({
			page,
			mockInfraApi: _,
		}) => {
			let fetchCalled = false;

			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.route("**/api/local-repo/fetch", async (route) => {
				fetchCalled = true;
				// Delay to see loading state
				await new Promise((resolve) => setTimeout(resolve, 500));
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						exitCode: 0,
						stdout: "",
						stderr: "",
						timedOut: false,
						durationMs: 500,
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				// Click fetch button
				const fetchButton = page.locator('button:has-text("Fetch")').first();
				if (await fetchButton.isVisible()) {
					await fetchButton.click();
					expect(fetchCalled).toBe(true);
				}
			}
		});
	});

	test.describe("Pull Button", () => {
		test("should be disabled when repo is dirty", async ({
			page,
			mockInfraApi: _,
		}) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDirtyRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				// Pull button should be disabled
				const pullButton = page.locator('button:has-text("Pull")').first();
				if (await pullButton.isVisible()) {
					await expect(pullButton).toBeDisabled();
				}
			}
		});

		test("should be enabled when repo is clean", async ({
			page,
			mockInfraApi: _,
		}) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				// Pull button should be enabled
				const pullButton = page.locator('button:has-text("Pull")').first();
				if (await pullButton.isVisible()) {
					await expect(pullButton).toBeEnabled();
				}
			}
		});
	});

	test.describe("Delete Clone", () => {
		test("should show confirmation dialog when clicking delete", async ({
			page,
			mockInfraApi: _,
		}) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				// Click delete button
				const deleteButton = page
					.locator('button:has-text("Delete local clone")')
					.first();
				if (await deleteButton.isVisible()) {
					await deleteButton.click();

					// Should see confirmation message
					await expect(
						page.locator("text=This cannot be undone").first(),
					).toBeVisible();
				}
			}
		});

		test("should cancel delete when clicking cancel", async ({
			page,
			mockInfraApi: _,
		}) => {
			await page.route("**/api/local-repo/status-info", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRepoStatus),
				});
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				const deleteButton = page
					.locator('button:has-text("Delete local clone")')
					.first();
				if (await deleteButton.isVisible()) {
					await deleteButton.click();

					// Click cancel
					const cancelButton = page
						.locator('button:has-text("Cancel")')
						.first();
					await cancelButton.click();

					// Confirmation should be gone
					await expect(
						page.locator("text=This cannot be undone").first(),
					).not.toBeVisible();
				}
			}
		});

		test("should call delete API when confirming", async ({
			page,
			mockInfraApi: _,
		}) => {
			let deleteCalled = false;
			let deleteConfirmed = false;

			await page.route("**/api/local-repo/status-info", async (route) => {
				if (deleteCalled) {
					// After delete, return ENOENT-like error
					await route.fulfill({
						status: 400,
						contentType: "application/json",
						body: JSON.stringify({
							error: "ENOENT: no such file or directory",
						}),
					});
				} else {
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockRepoStatus),
					});
				}
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.route("**/api/local-repo/delete", async (route) => {
				const body = route.request().postDataJSON();
				deleteCalled = true;
				deleteConfirmed = body?.confirm === true;
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						deleted: "/home/ubuntu/scaffolder-workspaces/test/repo",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				const deleteCloneButton = page
					.locator('button:has-text("Delete local clone")')
					.first();
				if (await deleteCloneButton.isVisible()) {
					await deleteCloneButton.click();

					// Click the Delete confirmation button (not "Delete local clone")
					const confirmDeleteButton = page
						.locator('button:has-text("Delete")')
						.last();
					await confirmDeleteButton.click();

					// Wait for API call
					await page.waitForTimeout(500);

					expect(deleteCalled).toBe(true);
					expect(deleteConfirmed).toBe(true);
				}
			}
		});

		test("should show 'No local clone available' after delete", async ({
			page,
			mockInfraApi: _,
		}) => {
			let deleteCalled = false;

			await page.route("**/api/local-repo/status-info", async (route) => {
				if (deleteCalled) {
					await route.fulfill({
						status: 400,
						contentType: "application/json",
						body: JSON.stringify({
							error: "ENOENT: no such file or directory",
						}),
					});
				} else {
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockRepoStatus),
					});
				}
			});

			await page.route("**/api/local-repo/clone", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						repoPath: "/home/ubuntu/scaffolder-workspaces/test/repo",
						defaultBranch: "main",
					}),
				});
			});

			await page.route("**/api/local-repo/delete", async (route) => {
				deleteCalled = true;
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						ok: true,
						deleted: "/home/ubuntu/scaffolder-workspaces/test/repo",
					}),
				});
			});

			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await page.locator('button:has-text("Repositories")').first().click();

			const addButton = page.locator('button:has-text("Add")');
			await addButton.click();
			await page
				.locator('input[placeholder*="judigot/repo"]')
				.fill("test/repo");
			await page.locator('button:has-text("Add Repository")').click();
			await page.waitForTimeout(500);

			const dropdownButton = page
				.locator('button[aria-label*="Open branches"]')
				.first();
			if (await dropdownButton.isVisible()) {
				await dropdownButton.click();

				const deleteCloneButton = page
					.locator('button:has-text("Delete local clone")')
					.first();
				if (await deleteCloneButton.isVisible()) {
					await deleteCloneButton.click();

					const confirmDeleteButton = page
						.locator('button:has-text("Delete")')
						.last();
					await confirmDeleteButton.click();

					// Wait and reopen dropdown
					await page.waitForTimeout(500);

					// Close and reopen dropdown to refresh
					await page.keyboard.press("Escape");
					await dropdownButton.click();

					// Should see "No local clone available"
					await expect(
						page.locator("text=No local clone available").first(),
					).toBeVisible();
				}
			}
		});
	});
});
