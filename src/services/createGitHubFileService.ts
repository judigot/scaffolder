import { Octokit } from '@octokit/rest';

interface ICreateGitHubFileRequest {
  publicRepoURL: string;
  filePath: string;
  content: string;
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

export const createGitHubFileService = async (
  data: ICreateGitHubFileRequest,
): Promise<{ success: boolean; message: string; url?: string }> => {
  const {
    publicRepoURL,
    filePath,
    content,
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
        fileSha = undefined;
      } else {
        throw error;
      }
    }

    const base64Content = Buffer.from(content, 'utf-8').toString('base64');

    const defaultCommitMessage =
      fileSha !== undefined && fileSha !== ''
        ? `Update ${filePath}`
        : `Create ${filePath}`;

    const updateParams: {
      owner: string;
      repo: string;
      path: string;
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: filePath,
      message:
        commitMessage !== undefined && commitMessage !== ''
          ? commitMessage
          : defaultCommitMessage,
      content: base64Content,
      branch: branch || 'main',
    };

    if (fileSha !== undefined && fileSha !== '') {
      updateParams.sha = fileSha;
    }

    await octokit.repos.createOrUpdateFileContents(updateParams);

    const branchName = branch || 'main';
    const fileUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branchName}/${filePath}`;

    const isUpdate = fileSha !== undefined && fileSha !== '';

    return {
      success: true,
      message: isUpdate
        ? 'File updated successfully'
        : 'File created successfully',
      url: fileUrl,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to create file: ${error.message}`);
    }
    throw new Error('Failed to create file: Unknown error');
  }
};
