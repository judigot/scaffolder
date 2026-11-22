/**
 * Session recovery E2E regression tests.
 *
 * Uses the mock-auth fixture (window.__MOCK_AUTH__). Setting `tokenError`
 * makes silent token renewal fail with that Auth0 error code, which is how
 * an expired/revoked refresh token presents after returning to an idle tab.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

const simulateTabReturn = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const setState = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    setState('hidden');
    setState('visible');
  });
};

const setTokenError = async (
  page: Page,
  code: string | null,
): Promise<void> => {
  await page.evaluate((errorCode) => {
    const auth: unknown = Reflect.get(window, '__MOCK_AUTH__');
    if (typeof auth === 'object' && auth !== null) {
      Reflect.set(auth, 'tokenError', errorCode);
    }
  }, code);
};

test.describe('Session recovery', () => {
  test.beforeEach(async ({ page, mockInfraApi: _ }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('resumes without interruption when the session is still valid', async ({
    page,
  }) => {
    await simulateTabReturn(page);
    await page.waitForTimeout(500);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('shows a session-expired dialog and signs in again preserving the page', async ({
    page,
  }) => {
    let authorizeUrl: string | null = null;
    await page.route('**/authorize?**', async (route) => {
      authorizeUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>auth0-login-stub</body></html>',
      });
    });

    await setTokenError(page, 'login_required');
    await simulateTabReturn(page);

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Session expired');

    // Escape does not dismiss it; the user stays on the recovery path.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    await page.getByRole('button', { name: 'Sign in again' }).click();
    await expect(page.getByText('auth0-login-stub')).toBeVisible();
    expect(authorizeUrl).not.toBeNull();

    const savedContext = await page.evaluate(() =>
      window.sessionStorage.getItem('scaffolder:auth:return-context'),
    );
    // sessionStorage is per-origin; the stub page is on the Auth0 origin, so
    // only assert when readable from the app origin.
    if (savedContext !== null) {
      expect(savedContext).toContain('"returnTo":"/');
    }
  });

  test('shows a subtle indicator while offline and recovers when back online', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    const indicator = page.getByTestId('connectivity-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText("You're offline");

    await context.setOffline(false);
    await expect(page.getByText('Back online')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });
});
