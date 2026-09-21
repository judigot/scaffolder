import { expect, test, type Page } from "@playwright/test";

import {
  clickEvidence,
  installEvidenceCursorOnContext,
  resetEvidenceZoom,
  typeEvidence,
} from "./helpers/evidence-cursor";
import {
  evidenceRecordDurationMs,
  evidenceScreencastQuality,
} from "./helpers/evidence-video-settings";
import {
  installEvidenceOverlays,
  installWindowLabelOnContext,
} from "./helpers/window-label";

const LABEL_LEFT = "Playwright docs";
const LABEL_RIGHT = "Wikipedia · GitHub Actions";

const PANEL = {
  width: Number(process.env.EVIDENCE_PANEL_WIDTH ?? "960"),
  height: Number(process.env.EVIDENCE_PANEL_HEIGHT ?? "1080"),
};

async function exercisePlaywrightDocs(page: Page) {
  await page.goto("https://playwright.dev/", { waitUntil: "domcontentloaded" });
  await installEvidenceOverlays(page, LABEL_LEFT);
  await expect(page.locator("body")).toContainText("Playwright");

  const getStarted = page.locator('a[href*="/docs/intro"]').first();
  if (await getStarted.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clickEvidence(page, getStarted);
  } else {
    await page.goto("https://playwright.dev/docs/intro", {
      waitUntil: "domcontentloaded",
    });
  }

  await expect(page).toHaveURL(/playwright\.dev\/docs\/intro/);
  await resetEvidenceZoom(page);
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -180);
  await page.waitForTimeout(500);
}

async function exerciseWikipedia(page: Page) {
  await page.goto("https://www.wikipedia.org/", {
    waitUntil: "domcontentloaded",
  });
  await installEvidenceOverlays(page, LABEL_RIGHT);

  const search = page.locator("#searchInput");
  await expect(search).toBeVisible({ timeout: 15_000 });
  await typeEvidence(page, search, "GitHub Actions", 65);
  await page.keyboard.press("Enter");

  await page.waitForURL(/wikipedia\.org\/(wiki|w\/index\.php)/, {
    timeout: 20_000,
  });
  await expect(page.locator("body")).toContainText(/GitHub/i);
  await resetEvidenceZoom(page);
  await page.mouse.wheel(0, 650);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(500);
}

test("public sites side by side", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);

  const durationMs = evidenceRecordDurationMs();
  const quality = evidenceScreencastQuality();
  const panelSize = { width: PANEL.width, height: PANEL.height };

  const leftContext = await browser.newContext({ viewport: panelSize });
  const rightContext = await browser.newContext({ viewport: panelSize });

  await installWindowLabelOnContext(leftContext, LABEL_LEFT);
  await installEvidenceCursorOnContext(leftContext);
  await installWindowLabelOnContext(rightContext, LABEL_RIGHT);
  await installEvidenceCursorOnContext(rightContext);

  const leftPage = await leftContext.newPage();
  const rightPage = await rightContext.newPage();

  const leftPath = testInfo.outputPath("panel-cats.webm");
  const rightPath = testInfo.outputPath("panel-dogs.webm");

  await resetEvidenceZoom(leftPage);
  await resetEvidenceZoom(rightPage);

  const recordStarted = Date.now();

  await Promise.all([
    leftPage.screencast.start({
      path: leftPath,
      size: panelSize,
      quality,
    }),
    rightPage.screencast.start({
      path: rightPath,
      size: panelSize,
      quality,
    }),
  ]);

  await Promise.all([
    leftPage.screencast.hideActions(),
    rightPage.screencast.hideActions(),
  ]);

  await Promise.all([
    exercisePlaywrightDocs(leftPage),
    exerciseWikipedia(rightPage),
  ]);

  const deadline = recordStarted + durationMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    await Promise.all([
      leftPage.waitForTimeout(Math.min(200, remaining)),
      rightPage.waitForTimeout(Math.min(200, remaining)),
    ]);
  }

  await Promise.all([
    resetEvidenceZoom(leftPage),
    resetEvidenceZoom(rightPage),
    leftPage.screencast.stop(),
    rightPage.screencast.stop(),
  ]);

  await leftContext.close();
  await rightContext.close();
});
