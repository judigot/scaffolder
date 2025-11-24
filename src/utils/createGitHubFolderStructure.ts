import type { IStructure } from '@/components/FileViewer.tsx';
import { Octokit } from '@octokit/rest';
import { watermark } from '@/constants.ts';

interface ICreateGitHubFolderStructureRequest {
  structure: IStructure;
  owner: string;
  repo: string;
  githubToken: string;
  basePath?: string;
  branch?: string;
}

async function createOrUpdateFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  branch: string,
): Promise<void> {
  let fileSha: string | undefined;

  try {
    const existingFile = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });

    if (Array.isArray(existingFile.data)) {
      throw new Error(`Path ${filePath} is a directory, not a file`);
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

  const finalWatermark = `/* ${watermark} */`;
  let fileContent = content;
  const fileType = filePath.split('.').pop()?.toLowerCase();

  if (fileType === 'php') {
    fileContent = fileContent.replace('<?php', `<?php\n${finalWatermark}`);
  } else {
    fileContent = `${finalWatermark}\n${fileContent}`;
  }

  const base64Content = Buffer.from(fileContent, 'utf-8').toString('base64');

  const updateParams: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    content: string;
    branch: string;
    sha?: string;
  } = {
    owner,
    repo,
    path: filePath,
    message:
      fileSha !== undefined && fileSha !== ''
        ? `Update ${filePath}`
        : `Create ${filePath}`,
    content: base64Content,
    branch,
  };

  if (fileSha !== undefined && fileSha !== '') {
    updateParams.sha = fileSha;
  }

  await octokit.repos.createOrUpdateFileContents(updateParams);
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
  } = data;

  const octokit = new Octokit({
    auth: githubToken,
  });

  let filesCreated = 0;

  const processItem = async (
    item: (typeof structure)[number],
    currentPath: string,
  ): Promise<void> => {
    if (item.type === 'folder') {
      const folderPath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;

      for (const child of item.children) {
        await processItem(child, folderPath);
      }
    } else {
      const filePath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;
      const fullPath = basePath === '' ? filePath : `${basePath}/${filePath}`;

      await createOrUpdateFile(
        octokit,
        owner,
        repo,
        fullPath,
        item.content,
        branch,
      );
      filesCreated += 1;
    }
  };

  for (const item of structure) {
    await processItem(item, '');
  }

  return {
    success: true,
    message: `Successfully created ${String(filesCreated)} file(s) in repository`,
    filesCreated,
  };
};
