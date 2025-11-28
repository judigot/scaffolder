import type { IRouteContext } from './types.ts';
import { fetchRepositoryFiles } from '@/utils/downloadPublicRepoFiles.ts';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';

function parseGitHubURL(
  url: string,
): { user: string; repository: string } | null {
  try {
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(url);

    if (match !== null && match.length === 3) {
      const user = match[1] || '';
      const repository = match[2] || '';
      return { user, repository };
    }
    return null;
  } catch {
    return null;
  }
}

interface IGetUserFilesRequest {
  publicRepoURL?: string;
}

function isGetUserFilesRequest(body: unknown): body is IGetUserFilesRequest {
  return body !== null && typeof body === 'object';
}

export const getUserFilesFromPublicRepoHandler = async (c: IRouteContext) => {
  try {
    const body = await c.req.json();
    if (!isGetUserFilesRequest(body)) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { publicRepoURL } = body;

    if (typeof publicRepoURL !== 'string' || publicRepoURL === '') {
      return c.status(400).json({
        error: 'Missing repository URL',
        message: 'Please provide a valid GitHub repository URL',
      });
    }

    const repoInfo = parseGitHubURL(publicRepoURL);
    if (repoInfo === null) {
      return c.status(400).json({
        error: 'Invalid GitHub URL',
        message:
          'The provided URL is not a valid GitHub repository URL. Expected format: https://github.com/username/repository',
      });
    }

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
    return c.status(500).json({
      error: 'Failed to fetch repository files',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
