/**
 * Automated tests for Chat Branch Checkout feature
 * Run with: bun run test src/tests/checkout-branch.test.ts
 */

import { afterAll, beforeAll, describe, expect, it as test } from 'vitest';

const API_BASE = 'http://localhost:3000';
const TEST_REPO_PATH = process.env.TEST_REPO_PATH ?? process.cwd();

// Get auth token from environment
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

const checkRepoExists = async (repoPath: string): Promise<boolean> => {
  try {
    const { execSync } = await import('node:child_process');
    execSync(`cd ${repoPath} && git status`, { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
};

const requireAuthToken = (): string => {
  if (AUTH_TOKEN === undefined || AUTH_TOKEN === '') {
    throw new Error(
      'TEST_AUTH_TOKEN must be provided to run authenticated checkout tests',
    );
  }
  return AUTH_TOKEN;
};

/**
 * Check if the backend server is reachable.
 * Returns true if server responds, false otherwise.
 */
const checkServerAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2000);
    const res = await fetch(`${API_BASE}/api/opencode/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};

const isServerAvailable = await checkServerAvailable();
const isRepoAvailable = await checkRepoExists(TEST_REPO_PATH);

describe('Chat Branch Checkout - Server Tests', () => {
  // Setup: ensure server is available and we're on main and clean
  beforeAll(async () => {
    if (!isServerAvailable) {
      throw new Error(
        'OpenCode proxy is not reachable at http://localhost:3000',
      );
    }
    const { execSync } = await import('node:child_process');
    try {
      execSync(`cd ${TEST_REPO_PATH} && git checkout main && git clean -fd`, {
        encoding: 'utf-8',
      });
    } catch (e) {
      console.warn('Setup warning:', e);
    }
  });

  // Cleanup: return to main
  afterAll(async () => {
    const { execSync } = await import('node:child_process');
    try {
      execSync(`cd ${TEST_REPO_PATH} && git checkout main`, {
        encoding: 'utf-8',
      });
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  });

  describe('OpenCode Health', () => {
    test('OpenCode proxy is reachable', async () => {
      const res = await fetch(`${API_BASE}/api/opencode/health`);
      expect(res.ok).toBe(true);

      const data: unknown = await res.json();
      expect(
        typeof data === 'object' &&
          data !== null &&
          'connected' in data &&
          data.connected,
      ).toBe(true);
    });
  });

  describe('Checkout API', () => {
    test('returns error without auth token', async () => {
      const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: TEST_REPO_PATH,
          branch: 'main',
        }),
      });

      expect(res.status).toBe(401);
      const data: unknown = await res.json();
      expect(
        typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string' &&
          data.error.includes('authorization'),
      ).toBe(true);
    });

    test('returns error without repoPath', async () => {
      const token = requireAuthToken();

      const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch: 'main',
        }),
      });

      expect(res.status).toBe(400);
      const data: unknown = await res.json();
      expect(
        typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string' &&
          data.error.includes('path'),
      ).toBe(true);
    });

    test('returns error without branch', async () => {
      const token = requireAuthToken();

      const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoPath: TEST_REPO_PATH,
        }),
      });

      expect(res.status).toBe(400);
      const data: unknown = await res.json();
      expect(
        typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string' &&
          data.error.includes('branch'),
      ).toBe(true);
    });

    test('successfully checks out existing branch', async () => {
      const token = requireAuthToken();

      const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoPath: TEST_REPO_PATH,
          branch: 'main',
        }),
      });

      expect(res.ok).toBe(true);
      const data: unknown = await res.json();
      expect(
        typeof data === 'object' && data !== null && 'ok' in data && data.ok,
      ).toBe(true);
    });

    test('returns error for non-existent branch', async () => {
      const token = requireAuthToken();

      const res = await fetch(`${API_BASE}/api/local-repo/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoPath: TEST_REPO_PATH,
          branch: 'non-existent-branch-xyz',
        }),
      });

      const data: unknown = await res.json();
      expect(
        typeof data === 'object' &&
          data !== null &&
          'ok' in data &&
          data.ok === false,
      ).toBe(true);
    });
  });
});

describe('Chat Branch Checkout - Unit Tests', () => {
  describe('Branch Extraction Regex', () => {
    // Test the regex patterns used to extract branch names from agent responses
    const extractBranchFromResponse = (text: string): string | null => {
      const patterns = [
        /git checkout -b ([\w\-/]+)/i,
        /Branch:\s*([\w\-/]+)/i,
        /created branch [`'"]?([\w\-/]+)[`'"]?/i,
        /switched to.*branch [`'"]?([\w\-/]+)[`'"]?/i,
      ];

      for (const pattern of patterns) {
        const match = pattern.exec(text);
        const matchedBranch = match?.[1];
        if (
          matchedBranch !== undefined &&
          matchedBranch !== '' &&
          matchedBranch !== 'main' &&
          matchedBranch !== 'master'
        ) {
          return matchedBranch;
        }
      }
      return null;
    };

    test("extracts branch from 'git checkout -b' command", () => {
      const text = 'Running: git checkout -b feat/add-file1';
      expect(extractBranchFromResponse(text)).toBe('feat/add-file1');
    });

    test("extracts branch from 'Branch:' format", () => {
      const text = '✓ Branch: feat/add-dark-mode\n✓ Files: 2 modified';
      expect(extractBranchFromResponse(text)).toBe('feat/add-dark-mode');
    });

    test("extracts branch from 'created branch' format", () => {
      const text = "I've created branch `fix/login-bug` and made the changes.";
      expect(extractBranchFromResponse(text)).toBe('fix/login-bug');
    });

    test("extracts branch from 'switched to branch' format", () => {
      const text = "Switched to a new branch 'refactor/api-client'";
      expect(extractBranchFromResponse(text)).toBe('refactor/api-client');
    });

    test('ignores main branch', () => {
      const text = 'git checkout -b main';
      expect(extractBranchFromResponse(text)).toBe(null);
    });

    test('ignores master branch', () => {
      const text = 'Branch: master';
      expect(extractBranchFromResponse(text)).toBe(null);
    });

    test('returns null for no branch pattern', () => {
      const text = "I've made some changes to the code.";
      expect(extractBranchFromResponse(text)).toBe(null);
    });
  });
});

describe('Git Operations', () => {
  beforeAll(() => {
    if (!isRepoAvailable) {
      throw new Error(`Test repo not found at ${TEST_REPO_PATH}`);
    }
  });

  test('can get current branch', async () => {
    const { execSync } = await import('node:child_process');
    const branch = execSync(
      `cd ${TEST_REPO_PATH} && git branch --show-current`,
      {
        encoding: 'utf-8',
      },
    ).trim();

    expect(branch).toBeTruthy();
    expect(typeof branch).toBe('string');
  });

  test('can list all branches', async () => {
    const { execSync } = await import('node:child_process');
    const branches = execSync(`cd ${TEST_REPO_PATH} && git branch -a`, {
      encoding: 'utf-8',
    });

    expect(branches).toContain('main');
  });
});
