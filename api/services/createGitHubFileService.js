import { Octokit } from '@octokit/rest';
function parseGitHubURL(url) {
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
export const createGitHubFileService = async (data) => {
  const {
    publicRepoURL,
    filePath,
    content,
    githubToken,
    branch = 'main',
    commitMessage,
    isBinary = false,
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
    let fileSha;
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
    } catch (error) {
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
    const base64Content = isBinary
      ? content
      : Buffer.from(content, 'utf-8').toString('base64');
    const defaultCommitMessage =
      fileSha !== undefined && fileSha !== ''
        ? `Update ${filePath}`
        : `Create ${filePath}`;
    const updateParams = {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create file: ${error.message}`);
    }
    throw new Error('Failed to create file: Unknown error');
  }
};
