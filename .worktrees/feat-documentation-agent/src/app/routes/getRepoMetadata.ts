import { Hono } from 'hono';
import { fetchRepoMetadata } from '@/utils/githubApiUtils.ts';

const router = new Hono();

function parseGitHubURL(
  url: string,
): { user: string; repository: string; branch?: string } | null {
  try {
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/;
    const match = githubRegex.exec(url);

    if (match && match.length >= 3) {
      return {
        user: match[1],
        repository: match[2],
        branch: match[3],
      };
    }
    return null;
  } catch {
    return null;
  }
}

router.post('/', async (c) => {
  const body = await c.req.json<{
    publicRepoURL?: string;
    branch?: string;
  }>();

  const { publicRepoURL, branch } = body;

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
    const metadata = await fetchRepoMetadata(
      repoInfo.user,
      repoInfo.repository,
      branch ?? repoInfo.branch ?? 'main',
    );

    return c.json(metadata);
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch repository metadata',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default router;
