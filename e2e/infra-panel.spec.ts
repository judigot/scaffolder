/**
 * Infrastructure Panel E2E Tests
 *
 * Tests the Infrastructure Control panel for workspace creation,
 * EC2/RDS instance type selection, and Terraform integration.
 */

import { expect, test } from "./fixtures";

test.describe("Infrastructure Panel", () => {
	test.describe("Navigation", () => {
		test("should navigate to Infrastructure tab from bottom navigation", async ({
			page,
			mockInfraApi,
		}) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			await expect(infraTab).toBeVisible();
			await infraTab.click();

			await expect(
				page.locator('text="Infrastructure Control"').first(),
			).toBeVisible();
		});
	});

	test.describe("UI Elements", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should display Infrastructure Control header", async ({ page }) => {
			await expect(
				page.locator('text="Infrastructure Control"').first(),
			).toBeVisible();
		});

		test("should display Manage Credentials button", async ({ page }) => {
			await expect(
				page.locator('button:has-text("Manage Credentials")').first(),
			).toBeVisible();
		});

		test("should display Add workspace section", async ({ page }) => {
			await expect(page.locator('text="Add workspace"').first()).toBeVisible();
		});

		test("should display workspace name input", async ({ page }) => {
			const input = page.locator("input#workspace-name");
			await expect(input).toBeVisible();
			await expect(input).toHaveAttribute("placeholder", "my-workspace");
		});

		test("should display mode selector", async ({ page }) => {
			const modeSelect = page.locator("select#workspace-mode");
			await expect(modeSelect).toBeVisible();
		});

		test("should display Create Workspace button", async ({ page }) => {
			await expect(
				page.locator('button:has-text("Create Workspace")').first(),
			).toBeVisible();
		});
	});

	test.describe("Workspace Mode Selection", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should default to Ubuntu EC2 mode", async ({ page }) => {
			const modeSelect = page.locator("select#workspace-mode");
			await expect(modeSelect).toHaveValue("api");
		});

		test("should show EC2 instance type dropdown in API mode", async ({
			page,
		}) => {
			const ec2Select = page.locator("select#ec2-instance-type");
			await expect(ec2Select).toBeVisible();
		});

		test("should show RDS toggle in API mode", async ({ page }) => {
			await expect(
				page.locator('text="Include RDS Database"').first(),
			).toBeVisible();
		});

		test("should switch to VCS mode and hide EC2/RDS options", async ({
			page,
		}) => {
			const modeSelect = page.locator("select#workspace-mode");
			await modeSelect.selectOption("vcs");

			await expect(page.locator("select#ec2-instance-type")).not.toBeVisible();
			await expect(
				page.locator('text="Include RDS Database"').first(),
			).not.toBeVisible();

			await expect(
				page.locator('text="VCS-connected workspace"').first(),
			).toBeVisible();
		});
	});

	test.describe("EC2 Instance Type Selection", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should have grouped EC2 instance types", async ({ page }) => {
			const ec2Select = page.locator("select#ec2-instance-type");
			await expect(ec2Select).toBeVisible();

			const optgroups = ec2Select.locator("optgroup");
			await expect(optgroups).toHaveCount(3);

			await expect(
				optgroups.filter({ hasText: "AI / High-Performance" }),
			).toBeVisible();
			await expect(optgroups.filter({ hasText: "GPU-Enabled" })).toBeVisible();
			await expect(
				optgroups.filter({ hasText: "General Purpose" }),
			).toBeVisible();
		});

		test("should default to t3.small instance type", async ({ page }) => {
			const ec2Select = page.locator("select#ec2-instance-type");
			await expect(ec2Select).toHaveValue("t3.small");
		});

		test("should allow selecting different instance types", async ({
			page,
		}) => {
			const ec2Select = page.locator("select#ec2-instance-type");

			await ec2Select.selectOption("g4dn.xlarge");
			await expect(ec2Select).toHaveValue("g4dn.xlarge");

			await ec2Select.selectOption("m7i.xlarge");
			await expect(ec2Select).toHaveValue("m7i.xlarge");
		});
	});

	test.describe("RDS Database Toggle", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should toggle RDS database option", async ({ page }) => {
			const rdsToggle = page
				.locator('button[role="switch"][aria-label="Toggle RDS"]')
				.first();
			await expect(rdsToggle).toBeVisible();

			await expect(rdsToggle).toHaveAttribute("aria-checked", "false");
			await expect(page.locator("select#rds-instance-class")).not.toBeVisible();

			await rdsToggle.click();

			await expect(rdsToggle).toHaveAttribute("aria-checked", "true");
			await expect(page.locator("select#rds-instance-class")).toBeVisible();
		});

		test("should have grouped RDS instance classes", async ({ page }) => {
			const rdsToggle = page
				.locator('button[role="switch"][aria-label="Toggle RDS"]')
				.first();
			await rdsToggle.click();

			const rdsSelect = page.locator("select#rds-instance-class");
			await expect(rdsSelect).toBeVisible();

			const optgroups = rdsSelect.locator("optgroup");
			await expect(optgroups).toHaveCount(3);

			await expect(
				optgroups.filter({ hasText: "General Purpose" }),
			).toBeVisible();
			await expect(
				optgroups.filter({ hasText: "Memory Optimized" }),
			).toBeVisible();
			await expect(
				optgroups.filter({ hasText: "Extreme Memory" }),
			).toBeVisible();
		});

		test("should default to db.t3.small RDS instance class", async ({
			page,
		}) => {
			const rdsToggle = page
				.locator('button[role="switch"][aria-label="Toggle RDS"]')
				.first();
			await rdsToggle.click();

			const rdsSelect = page.locator("select#rds-instance-class");
			await expect(rdsSelect).toHaveValue("db.t3.small");
		});
	});

	test.describe("Workspace Creation", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should show error for empty workspace name", async ({ page }) => {
			const createButton = page
				.locator('button:has-text("Create Workspace")')
				.first();
			await createButton.click();

			await expect(
				page.locator('text="Enter a workspace name to continue."').first(),
			).toBeVisible();
		});

		test("should create workspace with API mode and EC2 instance type", async ({
			page,
		}) => {
			const nameInput = page.locator("input#workspace-name");
			await nameInput.fill("my-test-workspace");

			const ec2Select = page.locator("select#ec2-instance-type");
			await ec2Select.selectOption("t3.medium");

			const createButton = page
				.locator('button:has-text("Create Workspace")')
				.first();
			await createButton.click();

			await expect(createButton).toHaveText("Creating...");

			await page.waitForTimeout(1000);

			await expect(nameInput).toHaveValue("");
		});

		test("should create workspace with VCS mode", async ({ page }) => {
			const nameInput = page.locator("input#workspace-name");
			await nameInput.fill("vcs-workspace");

			const modeSelect = page.locator("select#workspace-mode");
			await modeSelect.selectOption("vcs");

			const createButton = page
				.locator('button:has-text("Create Workspace")')
				.first();
			await createButton.click();

			await page.waitForTimeout(1000);

			await expect(nameInput).toHaveValue("");
		});

		test("should create workspace with RDS enabled", async ({ page }) => {
			const nameInput = page.locator("input#workspace-name");
			await nameInput.fill("workspace-with-rds");

			const rdsToggle = page
				.locator('button[role="switch"][aria-label="Toggle RDS"]')
				.first();
			await rdsToggle.click();

			const rdsSelect = page.locator("select#rds-instance-class");
			await rdsSelect.selectOption("db.m5.large");

			const createButton = page
				.locator('button:has-text("Create Workspace")')
				.first();
			await createButton.click();

			await page.waitForTimeout(1000);

			await expect(nameInput).toHaveValue("");
		});
	});

	test.describe("Existing Workspace Cards", () => {
		test.beforeEach(async ({ page, mockInfraApi }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const infraTab = page.locator('nav >> text="Infrastructure"').first();
			if (await infraTab.isVisible()) {
				await infraTab.click();
			}
		});

		test("should display workspace card with toggle", async ({ page }) => {
			await expect(
				page.locator('text="Terraform Workspace"').first(),
			).toBeVisible();

			const toggle = page
				.locator('button[role="switch"][aria-label="Toggle EC2 instance"]')
				.first();
			await expect(toggle).toBeVisible();
		});

		test("should display run status in workspace card", async ({ page }) => {
			await expect(page.locator('text="Run Status"').first()).toBeVisible();
		});

		test("should display latest output in workspace card", async ({ page }) => {
			await expect(page.locator('text="Latest Output"').first()).toBeVisible();
		});
	});
});

test.describe("Infrastructure Panel - Mobile Viewport", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test("should display mobile-optimized layout", async ({
		page,
		mockInfraApi,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const infraTab = page.locator('nav >> text="Infrastructure"').first();
		if (await infraTab.isVisible()) {
			await infraTab.click();
		}

		await expect(
			page.locator('text="Infrastructure Control"').first(),
		).toBeVisible();

		await expect(page.locator("input#workspace-name")).toBeVisible();
		await expect(page.locator("select#workspace-mode")).toBeVisible();
	});

	test("should allow workspace creation on mobile", async ({
		page,
		mockInfraApi,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const infraTab = page.locator('nav >> text="Infrastructure"').first();
		if (await infraTab.isVisible()) {
			await infraTab.click();
		}

		const nameInput = page.locator("input#workspace-name");
		await nameInput.fill("mobile-workspace");

		const createButton = page
			.locator('button:has-text("Create Workspace")')
			.first();
		await createButton.tap();

		await page.waitForTimeout(1000);

		await expect(nameInput).toHaveValue("");
	});
});
