import { Octokit } from '@octokit/rest';
export const createGitHubRepositoryService = async (data) => {
  const { repoName, description = '', isPrivate = false, githubToken } = data;
  if (!repoName || repoName === '') {
    throw new Error('Repository name is required');
  }
  if (!githubToken || githubToken === '') {
    throw new Error('GitHub token is required');
  }
  const octokit = new Octokit({
    auth: githubToken,
  });
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: description || undefined,
      private: isPrivate,
      auto_init: false,
    });
    const repoUrl = response.data.html_url;
    return {
      success: true,
      message: 'Repository created successfully',
      repoUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
    throw new Error('Failed to create repository: Unknown error');
  }
};
