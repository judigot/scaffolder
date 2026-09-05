import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { mergeCoreFilesWithScaffolded } from './mergeCoreFiles.ts';
import { findProjectsFolderAtRoot } from './findProjectsFolderAtRoot.ts';
import { excludeGlobsFromStructure } from './pathGlobs.ts';
import {
  BUNDLED_TEMPLATE_CORE_PATH,
  NESTJS_API_CORE_PATH,
  parseRecipeDirectives,
  recipeUsesNestApi,
  replaceCoversApi,
} from './recipeDirectives.ts';
import {
  stripHonoFromPackageJsonFiles,
  structureHasHonoApi,
} from './stripHonoPackageDeps.ts';

export class CoreMergeError extends Error {
  readonly code: 'TEMPLATE_API_CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'CoreMergeError';
    this.code = 'TEMPLATE_API_CONFLICT';
  }
}

export interface ILoadCoreFilesOptions {
  remoteBaseLayer?: IStructure;
}

const findProjectFolder = (
  projectYamlPath: string,
  userFiles: IStructure,
): IFolder | null => {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.substring(1)
    : projectYamlPath;

  const projectsFolder = findProjectsFolderAtRoot(userFiles);

  if (projectsFolder === undefined) {
    return null;
  }

  for (const child of projectsFolder.children) {
    if (child.type === 'folder') {
      const structureFile = child.children.find(
        (file): file is IFile =>
          file.type === 'file' && file.name === 'structure.yaml',
      );

      if (structureFile) {
        const expectedPath = `Projects/${child.name}/structure.yaml`;
        if (normPath === expectedPath) {
          return child;
        }
      }
    }
  }

  return null;
};

const resolveCoreImport = (
  corePath: string,
  userFiles: IStructure,
): IStructure => {
  const normPath = corePath.startsWith('/') ? corePath.substring(1) : corePath;

  const pathComponents = normPath.split('/');
  let currentItems: IStructure = userFiles;

  for (const component of pathComponents) {
    const folder = currentItems.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === component,
    );

    if (!folder) {
      return [];
    }

    currentItems = folder.children;
  }

  return currentItems;
};

function normalizeCorePath(corePath: string): string {
  const trimmed = corePath.trim();
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '');
  }
  return `/${trimmed.replace(/\/+$/, '')}`;
}

function assertNestCanLand(
  mergedCores: IStructure,
  corePaths: string[],
  replaceGlobs: string[],
): void {
  if (!recipeUsesNestApi(corePaths)) {
    return;
  }
  if (!structureHasHonoApi(mergedCores)) {
    return;
  }
  if (replaceCoversApi(replaceGlobs)) {
    return;
  }
  throw new CoreMergeError(
    'Live Hono template apps/api cannot be married with /Core/nestjs-api unless the recipe sets replace: [apps/api/**] before Nest lands.',
  );
}

/**
 * Loads core files with support for core imports from structure.yaml
 *
 * Supports both single string and array formats:
 * - Single: `$USE_CORE: /Core/vite`
 * - Multiple: `$USE_CORE: [/Core/vite, /Core/extra]`
 *
 * Merge order (later wins, merge cannot delete):
 * 1. Optional remote template_repo skeleton, or $BASE / source
 * 2. replace: globs (explicit delete of previous-layer paths)
 * 3. Remaining $USE_CORE imports
 * 4. Local core/ folder (highest priority - project-specific)
 *
 * Compat: omit $BASE and template_repo → today's $USE_CORE order
 * (typically starting with /Core/template-monorepo).
 */
export const loadCoreFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
  options: ILoadCoreFilesOptions = {},
): IStructure => {
  const projectFolder = findProjectFolder(projectYamlPath, userFiles);

  if (!projectFolder) {
    return [];
  }

  const structureFile = projectFolder.children.find(
    (file): file is IFile =>
      file.type === 'file' && file.name === 'structure.yaml',
  );

  let mergedCores: IStructure = [];
  let replaceGlobs: string[] = [];
  let corePaths: string[] = [];
  let nestReplacedApi = false;

  if (structureFile) {
    try {
      const directives = parseRecipeDirectives(structureFile.content);
      corePaths = directives.corePaths;
      replaceGlobs = directives.replaceGlobs;
      const remoteBase = options.remoteBaseLayer;
      const authorBase = directives.base;

      if (remoteBase !== undefined) {
        mergedCores = remoteBase;
        if (replaceGlobs.length > 0) {
          mergedCores = excludeGlobsFromStructure(mergedCores, replaceGlobs);
          nestReplacedApi = replaceCoversApi(replaceGlobs);
        }
        assertNestCanLand(mergedCores, corePaths, replaceGlobs);
      } else if (authorBase?.startsWith('/') === true) {
        mergedCores = resolveCoreImport(authorBase, userFiles);
        if (replaceGlobs.length > 0) {
          mergedCores = excludeGlobsFromStructure(mergedCores, replaceGlobs);
          nestReplacedApi = replaceCoversApi(replaceGlobs);
        }
        assertNestCanLand(mergedCores, corePaths, replaceGlobs);
      }

      const skippedBases = new Set<string>();
      if (remoteBase !== undefined) {
        skippedBases.add(BUNDLED_TEMPLATE_CORE_PATH);
      }
      if (authorBase !== null && remoteBase === undefined) {
        skippedBases.add(normalizeCorePath(authorBase));
      }

      for (const corePath of corePaths) {
        const normalized = normalizeCorePath(corePath);
        if (skippedBases.has(normalized)) {
          continue;
        }
        if (normalized === NESTJS_API_CORE_PATH) {
          assertNestCanLand(mergedCores, corePaths, replaceGlobs);
        }
        const importedCore = resolveCoreImport(corePath, userFiles);
        if (
          remoteBase === undefined &&
          authorBase === null &&
          normalized === BUNDLED_TEMPLATE_CORE_PATH &&
          replaceGlobs.length > 0
        ) {
          mergedCores = mergeCoreFilesWithScaffolded(mergedCores, importedCore);
          mergedCores = excludeGlobsFromStructure(mergedCores, replaceGlobs);
          nestReplacedApi = replaceCoversApi(replaceGlobs);
          continue;
        }
        mergedCores = mergeCoreFilesWithScaffolded(mergedCores, importedCore);
      }
    } catch (error) {
      if (error instanceof CoreMergeError) {
        throw error;
      }
      console.error('Error parsing structure.yaml for core imports:', error);
    }
  }

  const localCoreFolder = projectFolder.children.find(
    (item): item is IFolder => item.type === 'folder' && item.name === 'core',
  );

  if (localCoreFolder) {
    mergedCores = mergeCoreFilesWithScaffolded(
      mergedCores,
      localCoreFolder.children,
    );
  }

  if (nestReplacedApi || replaceCoversApi(replaceGlobs)) {
    mergedCores = stripHonoFromPackageJsonFiles(mergedCores);
  }

  return mergedCores;
};
