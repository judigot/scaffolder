import { expect, test } from '@playwright/test';
import { viteOrigin } from '../origins';

test.describe('Vite frontend (production build)', () => {
  test('identifies itself and renders the live API message', async ({
    page,
  }) => {
    await page.goto(`${viteOrigin}/`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Hello, world!',
    );
    await expect(page.getByTestId('framework-badge')).toHaveText('Vite');
  });
});
