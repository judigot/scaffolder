#!/usr/bin/env bun
import path from 'node:path';
import process from 'node:process';
import { promises as fs } from 'node:fs';
import { validateHtmlTemplateTags } from '@/utils/project-builder/template-processors/validateHtmlTemplateTags.ts';

const TARGET_DIRS = ['files/Projects', 'files/Core', 'files/Templates'];

type LintError = {
  file: string;
  message: string;
};

async function collectTemplates(
  dir: string,
  collected: string[],
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const targetPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTemplates(targetPath, collected);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.txt')) {
      collected.push(targetPath);
    }
  }
}

async function lintTemplates(): Promise<void> {
  const templateFiles: string[] = [];
  for (const targetDir of TARGET_DIRS) {
    await collectTemplates(targetDir, templateFiles);
  }

  if (templateFiles.length === 0) {
    console.warn('No template files found, nothing to lint.');
    return;
  }

  const errors: LintError[] = [];
  for (const filePath of templateFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    try {
      validateHtmlTemplateTags(content, path.relative(process.cwd(), filePath));
    } catch (error) {
      errors.push({
        file: filePath,
        message: (error as Error).message,
      });
    }
  }

  if (errors.length === 0) {
    console.log(
      `Checked ${templateFiles.length} template files — no tag issues detected.`,
    );
    return;
  }

  console.error(
    `\nTemplate lint detected ${errors.length} file(s) with unbalanced tags:`,
  );
  for (const error of errors) {
    console.group(`\n${path.relative(process.cwd(), error.file)}`);
    console.error(error.message);
    console.groupEnd();
  }
  process.exit(1);
}

lintTemplates().catch((error) => {
  console.error('Template lint failed:', error);
  process.exit(1);
});
