import type { IStructure } from '@/components/FileViewer.tsx';
import { Octokit } from '@octokit/rest';
import {
  getGitHubAppConfig,
  getGitHubAppOctokit,
} from '@/app/services/githubAppService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import { createGitBlobsWithRetry } from '@/utils/githubCreateBlobs.ts';

interface ICreateGitHubFolderStructureRequest {
  structure: IStructure;
  owner: string;
  repo: string;
  basePath?: string;
  branch?: string;
  commitMessage?: string;
  projectName?: string;
  /** Auth method: 'personal_token' | 'github_app' */
  method?: 'personal_token' | 'github_app';
  /** Auth0 user ID for personal token method */
  auth0UserId?: string;
}

interface IFileEntry {
  path: string;
  content: string;
  mode: '100644' | '100755' | '120000';
  type: 'blob';
  isBinary?: boolean;
}

function collectFiles(
  structure: IStructure,
  basePath: string,
  currentPath: string,
): IFileEntry[] {
  const files: IFileEntry[] = [];

  for (const item of structure) {
    if (item.type === 'folder') {
      const folderPath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;
      const nestedFiles = collectFiles(item.children, basePath, folderPath);
      files.push(...nestedFiles);
    } else {
      const filePath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;
      const fullPath = basePath === '' ? filePath : `${basePath}/${filePath}`;

      files.push({
        path: fullPath,
        content: item.content,
        mode: '100644',
        type: 'blob',
        isBinary: item.isBinary,
      });
    }
  }

  return files;
}

function buildTree(
  files: IFileEntry[],
  blobMap: Map<string, string>,
): {
  path: string;
  mode: '100644' | '100755' | '120000';
  type: 'blob';
  sha: string;
}[] {
  const tree: {
    path: string;
    mode: '100644' | '100755' | '120000';
    type: 'blob';
    sha: string;
  }[] = [];

  for (const file of files) {
    const sha = blobMap.get(file.path);
    if (sha !== undefined) {
      tree.push({
        path: file.path,
        mode: file.mode,
        type: file.type,
        sha,
      });
    }
  }

  return tree;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const createGitHubFolderStructure = async (
  data: ICreateGitHubFolderStructureRequest,
): Promise<{ success: boolean; message: string; filesCreated: number }> => {
  const {
    structure,
    owner,
    repo,
    basePath = '',
    branch = 'main',
    commitMessage,
    projectName,
    method,
    auth0UserId,
  } = data;

  let octokit: Octokit;

  /* Determine which authentication method to use */
  if (method === 'personal_token') {
    /* Use personal token */
    if (auth0UserId === undefined || auth0UserId === '') {
      throw new Error('User ID required for personal token method');
    }
    const userToken = await getGitHubToken(auth0UserId);
    if (userToken === null || userToken === '') {
      throw new Error(
        'GitHub token not found. Please add your personal access token in your profile settings.',
      );
    }
    octokit = new Octokit({ auth: userToken });
  } else {
    /* Use GitHub App (default) */
    const appConfig = getGitHubAppConfig();
    if (appConfig === null) {
      throw new Error(
        'GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables.',
      );
    }
    octokit = await getGitHubAppOctokit(appConfig, {
      owner,
    });
  }

  try {
    const files = collectFiles(structure, basePath, '');
    const filesCount = files.length;

    if (filesCount === 0) {
      return {
        success: true,
        message: 'No files to upload',
        filesCreated: 0,
      };
    }

    const displayName =
      typeof projectName === 'string' && projectName !== ''
        ? projectName
        : repo;

    const readmeContent = `# ${displayName}

This project was generated using [Scaffolder](https://github.com/scaffolder) - Write Once, Generate Forever!

## About Scaffolder

Scaffolder is a powerful tool designed to simplify and accelerate the process of building software applications. By automating the creation of essential code structures, Scaffolder allows you to focus on business logic—the unique processes and features that make your app valuable.

### Key Features

- ⚡ **Fast Generation**: Get your app's foundational features ready in minutes
- 🎯 **Deterministic Output**: 100% consistent code generation based on templates
- 🔄 **Pattern-Driven**: Design patterns once, generate code forever
- 🚀 **Enterprise-Grade**: Production-ready code that passes code review

## Getting Started

This project contains all the scaffolded files generated from your database schema. You can now:

1. Review the generated code structure
2. Customize the templates as needed
3. Add your business logic
4. Deploy and iterate

## Learn More

- 📚 [Scaffolder Documentation](https://scaffolder.dev)
- 💬 [Community Discussions](https://github.com/scaffolder)
- 🐛 [Report Issues](https://github.com/scaffolder/issues)

---

**Generated by Scaffolder** - Because your time is too valuable for boilerplate.

🚀 Write Once. Generate Forever.`;

    let baseTreeSha: string | undefined;
    let parents: string[] = [];

    const isRepositoryEmpty = (error: unknown): boolean => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const isEmpty =
          message.includes('empty') ||
          message.includes('git repository is empty') ||
          message.includes('repository is empty');
        const is404 =
          'status' in error &&
          typeof error.status === 'number' &&
          error.status === 404;
        return isEmpty || is404;
      }
      return false;
    };

    try {
      const refResponse = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      const baseCommitSha = refResponse.data.object.sha;

      const getCommitResponse = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: baseCommitSha,
      });

      baseTreeSha = getCommitResponse.data.tree.sha;
      parents = [baseCommitSha];
    } catch (error: unknown) {
      if (isRepositoryEmpty(error)) {
        baseTreeSha = undefined;
        parents = [];

        const readmeBase64 = Buffer.from(readmeContent, 'utf-8').toString(
          'base64',
        );
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: 'README.md',
          message: 'Initial commit by Scaffolder',
          content: readmeBase64,
          branch,
        });

        await delay(500);

        const refResponse = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });

        const baseCommitSha = refResponse.data.object.sha;

        const getCommitResponse = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: baseCommitSha,
        });

        baseTreeSha = getCommitResponse.data.tree.sha;
        parents = [baseCommitSha];
      } else {
        throw error;
      }
    }

    const blobMap = await createGitBlobsWithRetry(
      octokit.git,
      owner,
      repo,
      files,
    );
    const tree = buildTree(files, blobMap);

    const treeResponse = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    });

    const treeSha = treeResponse.data.sha;

    const projectFilesCommitMessage =
      commitMessage !== undefined && commitMessage !== ''
        ? commitMessage
        : `Add ${String(filesCount)} scaffolded file(s)`;

    const commitResponse = await octokit.git.createCommit({
      owner,
      repo,
      message: projectFilesCommitMessage,
      tree: treeSha,
      parents,
    });

    const commitSha = commitResponse.data.sha;

    try {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commitSha,
        force: true,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'status' in error &&
        typeof error.status === 'number' &&
        error.status === 404
      ) {
        await octokit.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: commitSha,
        });
      } else {
        throw error;
      }
    }

    return {
      success: true,
      message: `Successfully created ${String(filesCount)} file(s) in a single commit`,
      filesCreated: filesCount,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to create folder structure: ${error.message}`);
    }
    throw new Error('Failed to create folder structure: Unknown error');
  }
};
