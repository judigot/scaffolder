import { Hono } from 'hono';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const router = new Hono();

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

function parseCommitFromHTML(html: string): {
  sha: string;
  message: string;
  author: string;
  date: string;
} | null {
  const commitLinkRegex =
    /<li[^>]*data-commit-link="[^"]*\/commit\/([a-f0-9]{40})[^"]*"[^>]*>/i;
  const firstCommitMatch = commitLinkRegex.exec(html);
  if (!firstCommitMatch || firstCommitMatch.length < 2) {
    return null;
  }

  const sha = firstCommitMatch[1];
  const commitStartIndex = html.indexOf(firstCommitMatch[0]);
  const commitEndIndex = html.indexOf('</li>', commitStartIndex);
  if (commitEndIndex === -1) {
    return null;
  }
  const commitSection = html.substring(commitStartIndex, commitEndIndex + 5);

  const titleRegex = /title="([^"]+)"/i;
  const messageMatch = titleRegex.exec(commitSection);
  const message =
    messageMatch && messageMatch.length >= 2
      ? messageMatch[1].trim()
      : 'No commit message';

  const authorRegex = /aria-label="commits by ([^"]+)"[^>]*>([^<]+)<\/a>/i;
  const authorMatch = authorRegex.exec(commitSection);
  const author =
    authorMatch && authorMatch.length >= 3
      ? authorMatch[2].trim()
      : authorMatch && authorMatch.length >= 2
        ? authorMatch[1].trim()
        : 'Unknown';

  const relativeTimeRegex = /<relative-time[^>]*datetime="([^"]+)"[^>]*>/i;
  const relativeTimeMatch = relativeTimeRegex.exec(commitSection);
  const date =
    relativeTimeMatch && relativeTimeMatch.length >= 2
      ? relativeTimeMatch[1]
      : new Date().toISOString();

  return {
    sha,
    message,
    author,
    date,
  };
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
    const repoUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
    const branchUrl =
      branch !== 'main' && branch !== 'master'
        ? `${repoUrl}/tree/${branch}`
        : repoUrl;

    const response = await fetch(branchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return c.json(
          {
            error: 'Repository or branch not found',
            message: `Repository '${repoInfo.owner}/${repoInfo.repo}' or branch '${branch}' does not exist`,
          },
          404,
        );
      }
      throw new Error(
        `Failed to fetch repository page: HTTP ${String(response.status)}`,
      );
    }

    const html = await response.text();
    const commitInfo = parseCommitFromHTML(html);

    if (!commitInfo) {
      throw new Error(
        'Unable to parse commit information from repository page',
      );
    }

    const commitDate = new Date(commitInfo.date);
    const dateReadable = formatTimestamp(commitInfo.date);

    return c.json({
      sha: commitInfo.sha,
      message: commitInfo.message,
      author: {
        name: commitInfo.author,
        email: '',
        date: commitInfo.date,
        dateReadable,
        timestamp: commitDate.getTime(),
      },
      committer: {
        name: commitInfo.author,
        email: '',
        date: commitInfo.date,
        dateReadable,
        timestamp: commitDate.getTime(),
      },
      url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/commit/${commitInfo.sha}`,
      treeSha: '',
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
