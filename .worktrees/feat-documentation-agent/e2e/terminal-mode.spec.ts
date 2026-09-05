/**
 * Terminal Mode E2E Tests
 *
 * Tests the Terminal Mode feature on mobile and desktop viewports
 */

import { test, expect } from "./fixtures";

test.describe("Terminal Mode", () => {
	test.describe("Navigation", () => {
		test("should navigate to Terminal tab from bottom navigation", async ({
			page,
			mockTerminalApi,
		}) => {
			await page.goto("/");

			// Wait for app to load
			await page.waitForLoadState("networkidle");

			// Click on Terminal tab in bottom navigation
			const terminalTab = page.locator('nav >> text="Terminal"').first();
			await expect(terminalTab).toBeVisible();
			await terminalTab.click();

			// Verify Terminal Mode is visible
			await expect(page.locator('text="TERMINAL"').first()).toBeVisible();
		});
	});

	test.describe("UI Elements", () => {
		test.beforeEach(async ({ page, mockTerminalApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Navigate to Terminal tab
			const terminalTab = page.locator('nav >> text="Terminal"').first();
			if (await terminalTab.isVisible()) {
				await terminalTab.click();
			}
		});

		test("should display top bar with title", async ({ page }) => {
			await expect(page.locator('text="TERMINAL"').first()).toBeVisible();
		});

		test("should display secondary tabs", async ({ page }) => {
			await expect(page.locator('role=tab[name="Terminal"]')).toBeVisible();
			await expect(page.locator('role=tab[name="Files"]')).toBeVisible();
			await expect(page.locator('role=tab[name="Preview"]')).toBeVisible();
			await expect(page.locator('role=tab[name="Logs"]')).toBeVisible();
		});

		test("should display action buttons", async ({ page }) => {
			// YES button (checkmark)
			await expect(page.locator('button[aria-label*="yes" i], button[aria-label*="confirm" i]').first()).toBeVisible();
			// NO button (X)
			await expect(page.locator('button[aria-label*="no" i], button[aria-label*="cancel" i]').first()).toBeVisible();
		});

		test("should display command input", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await expect(input).toBeVisible();
		});

		test("should display mode indicator", async ({ page }) => {
			await expect(page.locator('button[aria-label*="Terminal mode" i]')).toBeVisible();
			await expect(page.locator('button[aria-label*="Agent mode" i]')).toBeVisible();
			await expect(page.locator('button[aria-label*="Ask mode" i]')).toBeVisible();
		});
	});

	test.describe("Command Execution", () => {
		test.beforeEach(async ({ page, mockTerminalApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Navigate to Terminal tab
			const terminalTab = page.locator('nav >> text="Terminal"').first();
			if (await terminalTab.isVisible()) {
				await terminalTab.click();
			}
		});

		test("should execute pwd command and show output", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await input.fill("pwd");

			// Press Enter or click submit
			await input.press("Enter");

			// Wait for response
			await page.waitForTimeout(500);

			// Verify output is displayed (in terminal viewport)
			await expect(page.locator('text="/home/ec2-user"').first()).toBeVisible({ timeout: 5000 });
		});

		test("should execute ls command and show output", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await input.fill("ls -la");
			await input.press("Enter");

			await page.waitForTimeout(500);

			// Verify some file output is shown
			await expect(page.locator('text=".bashrc"').first()).toBeVisible({ timeout: 5000 });
		});

		test("should execute echo command and show output", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await input.fill('echo "Hello World"');
			await input.press("Enter");

			await page.waitForTimeout(500);

			await expect(page.locator('text="Hello World"').first()).toBeVisible({ timeout: 5000 });
		});

		test("should clear input after command submission", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await input.fill("whoami");
			await input.press("Enter");

			// Input should be cleared
			await expect(input).toHaveValue("");
		});

		test("should handle failed commands gracefully", async ({ page }) => {
			const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
			await input.fill("cat /nonexistent");
			await input.press("Enter");

			await page.waitForTimeout(500);

			// Should show error message
			await expect(page.locator('text="No such file"').first()).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Secondary Tabs", () => {
		test.beforeEach(async ({ page, mockTerminalApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const terminalTab = page.locator('nav >> text="Terminal"').first();
			if (await terminalTab.isVisible()) {
				await terminalTab.click();
			}
		});

		test("should switch to Files tab", async ({ page }) => {
			await page.locator('role=tab[name="Files"]').click();
			await expect(page.locator('text="coming soon" i').first()).toBeVisible();
		});

		test("should switch to Preview tab", async ({ page }) => {
			await page.locator('role=tab[name="Preview"]').click();
			await expect(page.locator('text="coming soon" i').first()).toBeVisible();
		});

		test("should switch to Logs tab", async ({ page }) => {
			await page.locator('role=tab[name="Logs"]').click();
			await expect(page.locator('text="coming soon" i').first()).toBeVisible();
		});

		test("should return to Terminal tab", async ({ page }) => {
			// Switch away
			await page.locator('role=tab[name="Files"]').click();

			// Switch back
			await page.locator('role=tab[name="Terminal"]').click();

			// Verify terminal viewport is visible
			await expect(page.locator('[role="application"][aria-label="Terminal"]')).toBeVisible();
		});
	});

	test.describe("Connection Status", () => {
		test("should show connected status with host", async ({ page, mockTerminalApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const terminalTab = page.locator('nav >> text="Terminal"').first();
			if (await terminalTab.isVisible()) {
				await terminalTab.click();
			}

			// Should show connection status
			await expect(page.locator('text=/connected/i').first()).toBeVisible({ timeout: 5000 });
		});
	});
});

test.describe("Terminal Mode - Mobile Viewport", () => {
	test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

	test("should display mobile-optimized layout", async ({ page, mockTerminalApi }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Navigate to Terminal
		const terminalTab = page.locator('nav >> text="Terminal"').first();
		if (await terminalTab.isVisible()) {
			await terminalTab.click();
		}

		// Action buttons should be visible and accessible
		const actionButtons = page.locator('[class*="action"]').first();
		await expect(actionButtons).toBeVisible();

		// Command input should be at bottom
		const input = page.locator('input[placeholder*="terminal" i], textarea[placeholder*="terminal" i]').first();
		await expect(input).toBeVisible();
	});

	test("should handle touch interactions", async ({ page, mockTerminalApi }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const terminalTab = page.locator('nav >> text="Terminal"').first();
		if (await terminalTab.isVisible()) {
			await terminalTab.click();
		}

		// Tab buttons should respond to tap
		const filesTab = page.locator('role=tab[name="Files"]');
		await filesTab.tap();

		await expect(page.locator('text="coming soon" i').first()).toBeVisible();
	});
});
