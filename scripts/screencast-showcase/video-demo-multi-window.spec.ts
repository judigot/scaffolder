import { expect, test, type Page } from "@playwright/test";

import {
  installEvidenceCursor,
  installEvidenceCursorOnContext,
  resetEvidenceZoom,
  typeEvidence,
} from "./helpers/evidence-cursor";
import { recordEvidenceSegment } from "./helpers/evidence-screencast";
import {
  flashWindowLabel,
  installEvidenceOverlays,
  installWindowLabelOnContext,
} from "./helpers/window-label";

const LABEL_LEFT = "Window A · Playwright docs";
const LABEL_RIGHT = "Window B · Wikipedia";

async function loadPlaywright(page: Page) {
  await page.goto("https://playwright.dev/docs/intro", {
    waitUntil: "domcontentloaded",
  });
  await installEvidenceOverlays(page, LABEL_LEFT);
  await expect(page.locator("body")).toContainText("Playwright");
  await page.mouse.wheel(0, 480);
  await page.waitForTimeout(700);
}

async function loadWikipedia(page: Page) {
  await page.goto("https://www.wikipedia.org/", {
    waitUntil: "domcontentloaded",
  });
  await installEvidenceOverlays(page, LABEL_RIGHT);

  const search = page.locator("#searchInput");
  await expect(search).toBeVisible({ timeout: 15_000 });
  await typeEvidence(page, search, "Playwright software", 65);
  await page.keyboard.press("Enter");

  await page.waitForURL(/wikipedia\.org\/(wiki|w\/index\.php)/, {
    timeout: 20_000,
  });
  await expect(page.locator("body")).toContainText(/Playwright/i);
}

async function revisitPlaywright(page: Page) {
  await flashWindowLabel(page, LABEL_LEFT);
  await installEvidenceCursor(page);
  await expect(page).toHaveURL(/playwright\.dev\/docs\/intro/);
  await resetEvidenceZoom(page);
  await page.mouse.wheel(0, 620);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(450);
}

async function revisitWikipedia(page: Page) {
  await flashWindowLabel(page, LABEL_RIGHT);
  await installEvidenceCursor(page);
  await expect(page).toHaveURL(/wikipedia\.org\//);
  await resetEvidenceZoom(page);
  await page.mouse.wheel(0, 650);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(450);
}

test("public sites multi-window switching", async ({ browser }, testInfo) => {
  test.setTimeout(240_000);

  const leftContext = await browser.newContext();
  const rightContext = await browser.newContext();

  await installWindowLabelOnContext(leftContext, LABEL_LEFT);
  await installEvidenceCursorOnContext(leftContext);
  await installWindowLabelOnContext(rightContext, LABEL_RIGHT);
  await installEvidenceCursorOnContext(rightContext);

  const leftPage = await leftContext.newPage();
  const rightPage = await rightContext.newPage();

  await recordEvidenceSegment(
    leftPage,
    testInfo,
    "01-youtube-cats.webm",
    async () => {
      await loadPlaywright(leftPage);
    },
  );

  await recordEvidenceSegment(
    rightPage,
    testInfo,
    "02-youtube-dogs.webm",
    async () => {
      await loadWikipedia(rightPage);
    },
  );

  await recordEvidenceSegment(
    leftPage,
    testInfo,
    "03-youtube-cats-retained.webm",
    async () => {
      await revisitPlaywright(leftPage);
    },
  );

  await recordEvidenceSegment(
    rightPage,
    testInfo,
    "04-youtube-dogs-retained.webm",
    async () => {
      await revisitWikipedia(rightPage);
    },
  );

  await leftContext.close();
  await rightContext.close();
});
