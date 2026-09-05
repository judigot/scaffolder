/**
 * Scaffolder Code Tab E2E Test
 * Ensures repository fallback view never renders when projects exist.
 */

import path from 'node:path';
import { expect, test } from './fixtures.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';

const scaffolderFiles = convertLocalFilesToIStructure(
  path.resolve(process.cwd(), 'files'),
);

const scaffolderFilesWithoutProjects: typeof scaffolderFiles = scaffolderFiles
  .filter((item) => item.type !== 'folder' || item.name !== 'Projects')
  .map((item) => item);

const repoUrl = 'https://github.com/example/scaffolder-files';

test.describe('Scaffolder Code tab', () => {
  test.beforeEach(async ({ page, mockInfraApi: _ }) => {
    await page.addInitScript((url) => {
      localStorage.setItem(
        'ui-preferences',
        JSON.stringify({
          state: {
            topLevelTab: 'scaffolder',
            activeTab: 'fileViewer',
            selectedModel: 'gpt-5-nano',
          },
          version: 0,
        }),
      );

      localStorage.setItem(
        'scaffolder-store',
        JSON.stringify({
          state: {
            useLocalFiles: false,
            remoteFilesURL: url,
            selectedProject: null,
          },
          version: 0,
        }),
      );

      localStorage.setItem(
        'transformationsData',
        JSON.stringify({
          state: {
            schemaInfo: [],
          },
          version: 1,
        }),
      );

      Reflect.set(window, '__repoViewerSeen', false);
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="scaffolder-repo-viewer"]')) {
          Reflect.set(window, '__repoViewerSeen', true);
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }, repoUrl);
  });

  test('does not render repository fallback while projects parse', async ({
    page,
  }) => {
    await page.route('**/api/getUserFilesFromPublicRepo', async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 1200);
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scaffolderFiles),
      });
    });

    const userFilesResponse = page.waitForResponse((response) => {
      return (
        response.url().includes('/api/getUserFilesFromPublicRepo') &&
        response.status() === 200
      );
    });

    await page.goto('/');

    await userFilesResponse;

    await page.waitForTimeout(1500);

    await expect(page.getByTestId('scaffolder-repo-viewer')).toHaveCount(0);

    const repoViewerSeen = await page.evaluate(() => {
      return Reflect.get(window, '__repoViewerSeen') === true;
    });

    expect(repoViewerSeen).toBe(false);
  });

  test('renders repository fallback only when no Projects folder exists', async ({
    page,
  }) => {
    await page.route('**/api/getUserFilesFromPublicRepo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scaffolderFilesWithoutProjects),
      });
    });

    const userFilesResponse = page.waitForResponse((response) => {
      return (
        response.url().includes('/api/getUserFilesFromPublicRepo') &&
        response.status() === 200
      );
    });

    await page.goto('/');

    await userFilesResponse;

    await expect(page.getByTestId('scaffolder-repo-viewer')).toBeVisible();
  });
});
