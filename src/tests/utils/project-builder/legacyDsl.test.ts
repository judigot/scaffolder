import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import whitelist from '@/tests/utils/project-builder/legacyDslWhitelist.json';

const ROOT_DIR = path.resolve(process.cwd(), 'files');
const EXTENSIONS = new Set(['.txt', '.php', '.sql', '.yml', '.yaml', '.md']);
const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}/;
const LOOP_REGEX = /\[\[\s*LOOP\b/;
const LOOP_DATA_REGEX = /\[\[\s*LOOP_DATA_SOURCES\b/;

const normalizePath = (filePath: string): string =>
  filePath.replace(/\\/g, '/');

const isWhitelisted = (relativePath: string): boolean => {
  const normalized = normalizePath(relativePath);
  return whitelist.some((entry) => {
    const normalizedEntry = normalizePath(entry);
    if (normalizedEntry === normalized) {
      return true;
    }
    if (normalizedEntry.endsWith('/')) {
      return normalized.startsWith(normalizedEntry);
    }
    return normalized.startsWith(`${normalizedEntry}/`);
  });
};

const collectFiles = async (
  dir: string,
  collected: string[],
): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, collected);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    collected.push(entryPath);
  }
};

describe('Legacy DSL guardrail', () => {
  it('only appears in whitelisted templates', async () => {
    const files: string[] = [];
    await collectFiles(ROOT_DIR, files);
    const offenders: { relative: string; reasons: string[] }[] = [];

    for (const absolutePath of files) {
      const relativePath = path.relative(process.cwd(), absolutePath);
      if (isWhitelisted(relativePath)) {
        continue;
      }
      const content = await fs.readFile(absolutePath, 'utf8');
      const reasons: string[] = [];
      if (PLACEHOLDER_REGEX.test(content)) {
        reasons.push('placeholder');
      }
      if (LOOP_REGEX.test(content) || LOOP_DATA_REGEX.test(content)) {
        reasons.push('legacy loop');
      }
      if (reasons.length > 0) {
        offenders.push({ relative: normalizePath(relativePath), reasons });
      }
    }

    if (offenders.length > 0) {
      console.error('Legacy DSL detected outside whitelist:');
      for (const offender of offenders) {
        console.error(`  ${offender.relative}: ${offender.reasons.join(', ')}`);
      }
    }

    expect(offenders).toHaveLength(0);
  });
});
