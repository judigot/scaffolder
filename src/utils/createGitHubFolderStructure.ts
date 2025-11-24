import type { IStructure } from '@/components/FileViewer.tsx';
import { Octokit } from '@octokit/rest';

interface ICreateGitHubFolderStructureRequest {
  structure: IStructure;
  owner: string;
  repo: string;
  githubToken: string;
  basePath?: string;
  branch?: string;
  commitMessage?: string;
}

interface IFileEntry {
  path: string;
  content: string;
  mode: '100644' | '100755' | '120000';
  type: 'blob';
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
      });
    }
  }

  return files;
}

async function createBlobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: IFileEntry[],
): Promise<Map<string, string>> {
  const blobPromises = files.map(async (file) => {
    try {
      const base64Content = Buffer.from(file.content, 'utf-8').toString(
        'base64',
      );
      const response = await octokit.git.createBlob({
        owner,
        repo,
        content: base64Content,
        encoding: 'base64',
      });
      return { path: file.path, sha: response.data.sha };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to create blob for ${file.path}: ${error.message}`,
        );
      }
      throw new Error(`Failed to create blob for ${file.path}: Unknown error`);
    }
  });

  const blobResults = await Promise.all(blobPromises);
  const blobMap = new Map<string, string>();

  for (const result of blobResults) {
    blobMap.set(result.path, result.sha);
  }

  return blobMap;
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

export const createGitHubFolderStructure = async (
  data: ICreateGitHubFolderStructureRequest,
): Promise<{ success: boolean; message: string; filesCreated: number }> => {
  const {
    structure,
    owner,
    repo,
    githubToken,
    basePath = '',
    branch = 'main',
    commitMessage,
  } = data;

  const octokit = new Octokit({
    auth: githubToken,
  });

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

    let blobMap: Map<string, string>;

    try {
      blobMap = await createBlobs(octokit, owner, repo, files);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message.includes('empty') ||
          error.message.includes('Git Repository is empty'))
      ) {
        if (files.length > 0) {
          const firstFile = files[0];
          const base64Content = Buffer.from(
            firstFile.content,
            'utf-8',
          ).toString('base64');
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: firstFile.path,
            message: 'Initial commit by Scaffolder',
            content: base64Content,
            branch,
          });
          const remainingFiles = files.slice(1);
          if (remainingFiles.length > 0) {
            blobMap = await createBlobs(octokit, owner, repo, remainingFiles);
          } else {
            blobMap = new Map<string, string>();
          }
          const firstFileBlob = await octokit.git.createBlob({
            owner,
            repo,
            content: base64Content,
            encoding: 'base64',
          });
          blobMap.set(firstFile.path, firstFileBlob.data.sha);
        } else {
          throw new Error('No files to upload');
        }
      } else {
        throw error;
      }
    }

    const tree = buildTree(files, blobMap);

    let baseTreeSha: string | undefined;
    let parents: string[] = [];

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
      if (
        error instanceof Error &&
        'status' in error &&
        typeof error.status === 'number' &&
        error.status === 404
      ) {
        baseTreeSha = undefined;
        parents = [];
      } else {
        throw error;
      }
    }

    const treeResponse = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    });

    const treeSha = treeResponse.data.sha;

    const commitResponse = await octokit.git.createCommit({
      owner,
      repo,
      message:
        commitMessage !== undefined && commitMessage !== ''
          ? commitMessage
          : 'Initial commit by Scaffolder',
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
