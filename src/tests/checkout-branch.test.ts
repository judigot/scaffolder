/**
 * Unit tests for Chat Branch Checkout feature
 * Tests regex patterns and branch name extraction logic
 *
 * Note: Server integration tests require a running backend and should be run manually
 * or via e2e tests with Playwright.
 */

import { describe, expect, it as test } from 'vitest';

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
