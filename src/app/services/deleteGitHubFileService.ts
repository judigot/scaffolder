import { Octokit } from '@octokit/rest';

interface IDeleteGitHubFileRequest {
  publicRepoURL: string;
  filePath: string;
  githubToken: string;
  branch?: string;
  commitMessage?: string;
}

interface IParsedRepoInfo {
  owner: string;
  repo: string;
}

function parseGitHubURL(url: string): IParsedRepoInfo | null {
  try {
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(url);

    if (match?.length === 3) {
      return {
        owner: match[1],
        repo: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const deleteGitHubFileService = async (
  data: IDeleteGitHubFileRequest,
): Promise<{ success: boolean; message: string }> => {
  const {
    publicRepoURL,
    filePath,
    githubToken,
    branch = 'main',
    commitMessage,
  } = data;

  if (!publicRepoURL) {
    throw new Error('Repository URL is required');
  }

  if (!filePath) {
    throw new Error('File path is required');
  }

  if (!githubToken) {
    throw new Error('GitHub token is required');
  }

  const repoInfo = parseGitHubURL(publicRepoURL);
  if (!repoInfo) {
    throw new Error('Invalid GitHub repository URL');
  }

  const octokit = new Octokit({
    auth: githubToken,
  });

  try {
    /* Get the file SHA (required for deletion) */
    let fileSha: string | undefined;

    try {
      const existingFile = await octokit.repos.getContent({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        path: filePath,
        ref: branch,
      });

      if (Array.isArray(existingFile.data)) {
        throw new Error('Path is a directory, not a file');
      }

      if ('sha' in existingFile.data) {
        fileSha = existingFile.data.sha;
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'status' in error &&
        typeof error.status === 'number' &&
        error.status === 404
      ) {
        throw new Error('File not found in repository');
      }
      throw error;
    }

    if (fileSha === undefined || fileSha === '') {
      throw new Error('Could not get file SHA for deletion');
    }

    const defaultCommitMessage = `Delete ${filePath}`;

    await octokit.repos.deleteFile({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: filePath,
      message:
        commitMessage !== undefined && commitMessage !== ''
          ? commitMessage
          : defaultCommitMessage,
      sha: fileSha,
      branch: branch || 'main',
    });

    return {
      success: true,
      message: 'File deleted successfully',
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
    throw new Error('Failed to delete file: Unknown error');
  }
};
