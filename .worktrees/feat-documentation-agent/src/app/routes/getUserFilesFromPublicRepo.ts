import { Hono } from 'hono';
import { fetchRepositoryFiles } from '@/utils/downloadPublicRepoFiles.ts';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';

/**
 * Route that fetches files from a public GitHub repository and returns them in a structured format
 *
 * This implementation:
 * 1. Receives publicRepoURL from the frontend
 * 2. Parses the URL to extract user and repository
 * 3. Downloads files from the specified GitHub repository
 * 4. Extracts and processes the ZIP archive in memory
 * 5. Converts the flat file list to a nested folder structure
 * 6. Returns the structured data to the frontend
 *
 * This approach resolves CORS issues by handling the GitHub API requests
 * server-side rather than from the browser.
 */
const router = new Hono();

// Helper function to parse GitHub URL
function parseGitHubURL(
  url: string,
): { user: string; repository: string } | null {
  try {
    // Handle URLs like https://github.com/username/repository
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(url);

    if (match?.length === 3) {
      return {
        user: match[1],
        repository: match[2],
      };
    }
    return null;
  } catch {
    // Ignore any errors and return null
    return null;
  }
}

router.post('/', async (c) => {
  const body = await c.req.json<{ publicRepoURL?: string }>();

  const { publicRepoURL } = body;

  if (typeof publicRepoURL !== 'string' || publicRepoURL === '') {
    return c.json(
      {
        error: 'Missing repository URL',
        message: 'Please provide a valid GitHub repository URL',
      },
      400,
    );
  }

  const repoInfo = parseGitHubURL(publicRepoURL);
  if (!repoInfo) {
    return c.json(
      {
        error: 'Invalid GitHub URL',
        message:
          'The provided URL is not a valid GitHub repository URL. Expected format: https://github.com/username/repository',
      },
      400,
    );
  }

  try {
    const extractedFiles = await fetchRepositoryFiles({
      user: repoInfo.user,
      repository: repoInfo.repository,
      branch: 'main',
      filesToFetch: ['*'],
      keepFolderStructure: true,
    });

    const result = convertPublicRepoFilesToStructure(extractedFiles);

    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch repository files',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default router;
