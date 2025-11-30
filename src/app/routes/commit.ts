import { Hono } from 'hono';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const router = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

function getRepositoryInfo(): { owner: string; repo: string } | null {
  const manualRepo = process.env.GITHUB_REPOSITORY;
  if (typeof manualRepo === 'string' && manualRepo !== '') {
    const [owner, repo] = manualRepo.split('/');
    if (
      typeof owner === 'string' &&
      owner !== '' &&
      typeof repo === 'string' &&
      repo !== ''
    ) {
      return { owner, repo };
    }
  }

  const vercelOwner = process.env.VERCEL_GIT_REPO_OWNER;
  const vercelRepo = process.env.VERCEL_GIT_REPO_SLUG;
  if (
    typeof vercelOwner === 'string' &&
    vercelOwner !== '' &&
    typeof vercelRepo === 'string' &&
    vercelRepo !== ''
  ) {
    return { owner: vercelOwner, repo: vercelRepo };
  }

  try {
    const gitConfigPath = join(process.cwd(), '.git', 'config');
    const config = readFileSync(gitConfigPath, 'utf-8');
    const urlRegex = /url\s*=\s*(.+)/;
    const urlMatch = urlRegex.exec(config);
    const remoteURL = urlMatch?.[1]?.trim();
    if (typeof remoteURL === 'string' && remoteURL !== '') {
      return parseGitHubURL(remoteURL);
    }
  } catch {
    try {
      const remote = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
        cwd: process.cwd(),
      }).trim();
      if (typeof remote === 'string' && remote !== '') {
        return parseGitHubURL(remote);
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getCurrentBranch(): string {
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF;
  if (typeof vercelBranch === 'string' && vercelBranch !== '') {
    return vercelBranch;
  }

  const githubRef = process.env.GITHUB_REF;
  if (typeof githubRef === 'string' && githubRef !== '') {
    const branch = githubRef.replace(/^refs\/heads\//, '');
    if (typeof branch === 'string' && branch !== '') {
      return branch;
    }
  }

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();
    return branch || 'main';
  } catch {
    return 'main';
  }
}

function parseGitHubURL(url: string): { owner: string; repo: string } | null {
  try {
    const cleanUrl = url
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/');
    const githubRegex = /github\.com[/:]([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(cleanUrl);

    if (match && match.length >= 3) {
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

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return `${String(diffSecs)} second${diffSecs !== 1 ? 's' : ''} ago`;
  }
  if (diffMins < 60) {
    return `${String(diffMins)} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${String(diffHours)} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${String(diffDays)} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

router.get('/', async (c) => {
  try {
    const repoInfo = getRepositoryInfo();
    if (!repoInfo) {
      const isVercel = process.env.VERCEL === '1';
      return c.json(
        {
          error: 'Git repository not found',
          message: isVercel
            ? 'Unable to determine repository. Enable system environment variables in Vercel project settings, or set GITHUB_REPOSITORY environment variable (format: owner/repo).'
            : 'Unable to determine repository. Set GITHUB_REPOSITORY environment variable (format: owner/repo), or ensure git is available locally.',
        },
        500,
      );
    }

    const branch = getCurrentBranch();

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    const refResponse = await fetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/ref/heads/${branch}`,
      { headers },
    );

    if (!refResponse.ok) {
      if (refResponse.status === 404) {
        return c.json(
          {
            error: 'Branch not found',
            message: `Branch '${branch}' does not exist in the repository`,
          },
          404,
        );
      }
      if (refResponse.status === 403) {
        return c.json(
          {
            error: 'Rate limit exceeded',
            message: 'GitHub API rate limit exceeded. Please try again later.',
          },
          403,
        );
      }
      throw new Error(
        `Failed to fetch branch: HTTP ${String(refResponse.status)}`,
      );
    }

    const refDataUnknown: unknown = await refResponse.json();
    const isRefData = (val: unknown): val is { object: { sha: string } } => {
      if (!isRecord(val)) {
        return false;
      }
      if (!('object' in val)) {
        return false;
      }
      const objVal = val.object;
      if (!isRecord(objVal)) {
        return false;
      }
      if (!('sha' in objVal)) {
        return false;
      }
      return typeof objVal.sha === 'string';
    };
    if (!isRefData(refDataUnknown)) {
      throw new Error('Invalid response format from GitHub API');
    }
    const commitSha = refDataUnknown.object.sha;

    const commitResponse = await fetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/commits/${commitSha}`,
      { headers },
    );

    if (!commitResponse.ok) {
      throw new Error(
        `Failed to fetch commit: HTTP ${String(commitResponse.status)}`,
      );
    }

    const commitDataUnknown: unknown = await commitResponse.json();
    const isCommitData = (
      val: unknown,
    ): val is {
      sha: string;
      message: string;
      author: { name: string; date: string; email: string };
      committer: { name: string; date: string; email: string };
      tree: { sha: string };
      url: string;
    } => {
      if (!isRecord(val)) {
        return false;
      }
      if (
        typeof val.sha !== 'string' ||
        typeof val.message !== 'string' ||
        typeof val.url !== 'string' ||
        !isRecord(val.author) ||
        !isRecord(val.committer) ||
        !isRecord(val.tree)
      ) {
        return false;
      }
      return (
        typeof val.author.name === 'string' &&
        typeof val.author.date === 'string' &&
        typeof val.author.email === 'string' &&
        typeof val.committer.name === 'string' &&
        typeof val.committer.date === 'string' &&
        typeof val.committer.email === 'string' &&
        typeof val.tree.sha === 'string'
      );
    };
    if (!isCommitData(commitDataUnknown)) {
      throw new Error('Invalid commit data format from GitHub API');
    }
    const commitData = commitDataUnknown;

    const authorDate = new Date(commitData.author.date);
    const committerDate = new Date(commitData.committer.date);

    return c.json({
      sha: commitData.sha,
      message: commitData.message.trim(),
      author: {
        name: commitData.author.name,
        email: commitData.author.email,
        date: commitData.author.date,
        dateReadable: formatTimestamp(commitData.author.date),
        timestamp: authorDate.getTime(),
      },
      committer: {
        name: commitData.committer.name,
        email: commitData.committer.email,
        date: commitData.committer.date,
        dateReadable: formatTimestamp(commitData.committer.date),
        timestamp: committerDate.getTime(),
      },
      url: commitData.url,
      treeSha: commitData.tree.sha,
      branch,
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
    });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch latest commit',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default router;
