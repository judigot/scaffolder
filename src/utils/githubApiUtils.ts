interface IGitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface IGitHubTreeResponse {
  sha: string;
  url: string;
  tree: IGitHubTreeItem[];
  truncated: boolean;
}

interface IGitHubFileResponse {
  content: string;
  encoding: string;
  sha: string;
  size: number;
  url: string;
}

import { isRecord } from '@/utils/typeGuards.ts';

export interface IFileMetadata {
  path: string;
  type: 'file' | 'folder';
  size?: number;
  sha?: string;
}

const getProperty = (obj: unknown, key: string): unknown => {
  if (!isRecord(obj)) {
    return undefined;
  }
  if (Object.hasOwn(obj, key)) {
    return obj[key];
  }
  return undefined;
};

export async function fetchRepoMetadata(
  user: string,
  repository: string,
  branch = 'main',
): Promise<IFileMetadata[]> {
  const apiUrl = `https://api.github.com/repos/${user}/${repository}/git/trees/${branch}?recursive=1`;

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Repository not found: ${user}/${repository} or branch '${branch}' does not exist`,
      );
    }
    if (response.status === 403) {
      throw new Error(
        'GitHub API rate limit exceeded. Please try again later.',
      );
    }
    throw new Error(
      `Failed to fetch repository metadata: HTTP ${String(response.status)}`,
    );
  }

  const data: unknown = await response.json();

  const isGitHubTreeResponse = (val: unknown): val is IGitHubTreeResponse => {
    if (typeof val !== 'object' || val === null) {
      return false;
    }
    const tree = getProperty(val, 'tree');
    return Array.isArray(tree);
  };

  if (!isGitHubTreeResponse(data)) {
    throw new Error('Invalid GitHub API response format');
  }

  return data.tree.map((item) => ({
    path: item.path,
    type: item.type === 'tree' ? 'folder' : 'file',
    size: item.size,
    sha: item.sha,
  }));
}

export async function fetchFileContent(
  user: string,
  repository: string,
  filePath: string,
  branch = 'main',
): Promise<{ content: string; isBinary: boolean }> {
  const apiUrl = `https://api.github.com/repos/${user}/${repository}/contents/${filePath}?ref=${branch}`;

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (response.status === 403) {
      throw new Error(
        'GitHub API rate limit exceeded. Please try again later.',
      );
    }
    throw new Error(
      `Failed to fetch file content: HTTP ${String(response.status)}`,
    );
  }

  const data: unknown = await response.json();

  const isGitHubFileResponse = (val: unknown): val is IGitHubFileResponse => {
    if (typeof val !== 'object' || val === null) {
      return false;
    }
    const encoding = getProperty(val, 'encoding');
    const content = getProperty(val, 'content');
    return typeof encoding === 'string' && typeof content === 'string';
  };

  if (!isGitHubFileResponse(data)) {
    throw new Error('Invalid GitHub API response format');
  }

  if (data.encoding === 'base64') {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const isBinary = data.size > 1024 * 1024 || !isTextFile(filePath);
    return { content, isBinary };
  }

  throw new Error(`Unsupported encoding: ${data.encoding}`);
}

function isTextFile(filePath: string): boolean {
  const textExtensions = new Set([
    '.txt',
    '.md',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.yaml',
    '.yml',
    '.xml',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.py',
    '.rb',
    '.go',
    '.rs',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.hpp',
    '.cs',
    '.swift',
    '.kt',
    '.sh',
    '.bash',
    '.zsh',
    '.php',
    '.sql',
    '.dockerfile',
    '.tf',
    '.tfvars',
  ]);

  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return textExtensions.has(ext) || !filePath.includes('.');
}
