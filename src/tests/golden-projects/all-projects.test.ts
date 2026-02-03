/**
 * TRUE GOLDEN TEST: All Complete Projects
 *
 * Dynamically discovers all projects with $USE_CORE directive (complete apps).
 * Tests with masterSchema which includes all relationship types:
 * - One-to-one (user ↔ profile)
 * - One-to-many (user → posts)
 * - Many-to-many (orders ↔ products via order_product)
 *
 * Production-Readiness Verification:
 * - Template processing (no syntax errors)
 * - TypeScript compilation (type checking)
 * - Dependency installation (bun install)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Master Schema with Multiple User Types - most comprehensive coverage:
// - One-to-one (user ↔ profile)
// - One-to-many (user → posts, customer → order)
// - Many-to-many x2 (order ↔ product, user ↔ user_type)
// - Soft deletes (deleted_at)
// - 9 tables total
import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

// Validate JSON matches expected shape at runtime
// Uses structural type guard - validates tableName and columnsInfo exist
// The Zod validator in schemaInfoValidator.ts enforces stricter AI conventions
// (like 'id' column naming) that don't apply to manually-created schemas
if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
  // Required IFormStore fields with defaults
  schemaInput: {},
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: 'Schema Builder',
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 0,
  dbName: '',
  setCreationMode: () => undefined,
  setMasterSchema: () => undefined,
  setOneToOne: () => undefined,
  setOneToMany: () => undefined,
  setManyToMany: () => undefined,
  setDBType: () => undefined,
  setPublicRepoURL: () => undefined,
  setDbConnection: () => undefined,
};

const filesDir = path.resolve(__dirname, '../../../files');
// Write output to /tmp to avoid bun scanning generated test files
const outputBaseDir = '/tmp/golden-test-output';

// Type-safe factory functions for IStructure items
function createFile(name: string, content: string): IFile {
  return { type: 'file', name, content };
}

function createFolder(name: string, children: IStructure): IFolder {
  return { type: 'folder', name, children };
}

// Type guard for objects
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Type-safe error extraction
function getErrorDetails(error: unknown): { stderr: string; message: string } {
  if (isRecord(error)) {
    const stderr = error.stderr;
    const message = error.message;
    return {
      stderr: typeof stderr === 'string' ? stderr : '',
      message: typeof message === 'string' ? message : '',
    };
  }
  return { stderr: '', message: String(error) };
}

/**
 * Discovers complete projects (those with $USE_CORE directive)
 * These are full, deployable app templates, not modules or partial projects.
 */
function discoverCompleteProjects(): string[] {
  const projectsDir = path.join(filesDir, 'Projects');
  const projects: string[] = [];

  if (!fs.existsSync(projectsDir)) {
    return projects;
  }

  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const structurePath = path.join(projectsDir, entry.name, 'structure.yaml');
    if (!fs.existsSync(structurePath)) {
      continue;
    }

    const content = fs.readFileSync(structurePath, 'utf-8');

    // Only include projects with $USE_CORE - these are complete projects
    if (content.includes('$USE_CORE')) {
      projects.push(entry.name);
    }
  }

  return projects.sort();
}

function loadDirectoryAsStructure(dirPath: string): IStructure {
  const items: IStructure = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push(createFolder(entry.name, loadDirectoryAsStructure(fullPath)));
    } else {
      items.push(createFile(entry.name, fs.readFileSync(fullPath, 'utf-8')));
    }
  }
  return items;
}

function writeStructureToDisk(structure: IStructure, basePath: string): void {
  for (const item of structure) {
    const itemPath = path.join(basePath, item.name);
    if (item.type === 'folder') {
      fs.mkdirSync(itemPath, { recursive: true });
      writeStructureToDisk(item.children, itemPath);
    } else {
      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      fs.writeFileSync(itemPath, item.content);
    }
  }
}

/**
 * Runs a shell command in a directory and returns the result.
 */
function runCommand(
  command: string,
  cwd: string,
  timeoutMs = 120000,
): { success: boolean; error?: string; stdout?: string } {
  try {
    const stdout = execSync(command, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, stdout };
  } catch (err: unknown) {
    const details = getErrorDetails(err);
    return {
      success: false,
      error: details.stderr !== '' ? details.stderr : details.message,
    };
  }
}

function hasPackageJson(outputDir: string): boolean {
  return fs.existsSync(path.join(outputDir, 'package.json'));
}

function hasTsConfig(outputDir: string): boolean {
  return fs.existsSync(path.join(outputDir, 'tsconfig.json'));
}

// Discover complete projects at test definition time
const completeProjects = discoverCompleteProjects();

// Cache user files - loaded once
let cachedUserFiles: IStructure | null = null;
function getUserFiles(): IStructure {
  cachedUserFiles ??= loadDirectoryAsStructure(filesDir);
  return cachedUserFiles;
}

// Cache build results to avoid duplicate builds
const buildCache = new Map<
  string,
  Awaited<ReturnType<typeof buildProjectFiles>>
>();

async function getCachedBuild(
  projectName: string,
): Promise<Awaited<ReturnType<typeof buildProjectFiles>>> {
  const cached = buildCache.get(projectName);
  if (cached !== undefined) {
    return cached;
  }
  const result = await buildProjectFiles(
    `/Projects/${projectName}/structure.yaml`,
    getUserFiles(),
    masterSchema,
    mockFormData,
    null,
  );
  buildCache.set(projectName, result);
  return result;
}

describe('TRUE GOLDEN TEST: Complete Projects', () => {
  beforeAll(
    () => {
      // Clean output directory
      if (fs.existsSync(outputBaseDir)) {
        fs.rmSync(outputBaseDir, { recursive: true });
      }
      fs.mkdirSync(outputBaseDir, { recursive: true });
      // Reset caches
      cachedUserFiles = null;
      buildCache.clear();
    },
    30000, // 30 second timeout for setup
  );

  it(`should discover ${String(completeProjects.length)} complete projects`, () => {
    console.log('\nDiscovered complete projects (with $USE_CORE):');
    completeProjects.forEach((p) => {
      console.log(`  - ${p}`);
    });
    expect(completeProjects.length).toBeGreaterThan(0);
  });

  // Test each project with masterSchema
  describe.each(completeProjects)('Project: %s', (projectName) => {
    const outputDir = path.join(outputBaseDir, projectName);

    it('should generate files without errors', async () => {
      const result = await getCachedBuild(projectName);

      // Write to disk for inspection
      if (result.structure.length > 0) {
        fs.mkdirSync(outputDir, { recursive: true });
        writeStructureToDisk(result.structure, outputDir);
      }

      if (result.filesFailedToFormat.length > 0) {
        console.log(`\n[${projectName}] Format errors:`);
        result.filesFailedToFormat.forEach((f) => {
          console.log(`  - ${f.filePath}: ${f.errorMessage.split('\n')[0]}`);
        });
      }

      expect(result.filesFailedToFormat).toHaveLength(0);
      expect(result.structure.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for build

    it('should have no unprocessed template syntax', async () => {
      const result = await getCachedBuild(projectName);

      // Binary/non-text file extensions to skip
      const binaryExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.ico',
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
        '.pdf',
      ];

      const checkForTemplateSyntax = (
        items: IStructure,
        filePath = '',
      ): void => {
        for (const item of items) {
          const currentPath =
            filePath !== '' ? `${filePath}/${item.name}` : item.name;
          if (item.type === 'file') {
            // Skip binary files
            const ext = path.extname(item.name).toLowerCase();
            if (binaryExtensions.includes(ext)) {
              continue;
            }

            const issues: string[] = [];
            // Match template placeholders like {{variableName}} but not JSX like {{ prop }}
            if (/\{\{[a-zA-Z_][a-zA-Z0-9_()]*\}\}/.test(item.content)) {
              issues.push('{{...}}');
            }
            if (item.content.includes('[[')) {
              issues.push('[[');
            }
            if (item.content.includes('@LOOP')) {
              issues.push('@LOOP');
            }
            if (item.content.includes('<@@')) {
              issues.push('<@@');
            }
            if (item.content.includes('{% IF')) {
              issues.push('{% IF');
            }

            if (issues.length > 0) {
              throw new Error(
                `Unprocessed template syntax in ${currentPath}: ${issues.join(', ')}`,
              );
            }
          } else {
            checkForTemplateSyntax(item.children, currentPath);
          }
        }
      };

      checkForTemplateSyntax(result.structure);
    });

    // Production-readiness smoke tests
    describe('production-readiness', () => {
      it('should install dependencies and pass TypeScript check', () => {
        // Skip if output doesn't exist yet (generation failed)
        if (!fs.existsSync(outputDir)) {
          console.log(`  [SKIP] Output directory not found: ${outputDir}`);
          return;
        }

        // Skip if no package.json (not a runnable app)
        if (!hasPackageJson(outputDir)) {
          console.log(`  [SKIP] No package.json in ${outputDir}`);
          return;
        }

        // Install dependencies
        const installResult = runCommand('bun install', outputDir);

        if (!installResult.success) {
          console.log(`\n[${projectName}] bun install failed:`);
          console.log(installResult.error?.slice(0, 500));
          expect(installResult.success).toBe(true);
          return;
        }

        // Skip TypeScript check if no tsconfig.json
        if (!hasTsConfig(outputDir)) {
          console.log(`  [SKIP] No tsconfig.json in ${outputDir}`);
          return;
        }

        const result = runCommand('bunx tsc --noEmit', outputDir, 60000);

        if (!result.success) {
          console.log(`\n[${projectName}] TypeScript errors:`);
          console.log(result.error?.slice(0, 1000));
        }

        expect(result.success).toBe(true);
      }, 120000); // 2 minute timeout
    });
  });
});
