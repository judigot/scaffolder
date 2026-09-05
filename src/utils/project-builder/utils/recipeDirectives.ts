import type { IFile, IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { findProjectsFolderAtRoot } from './findProjectsFolderAtRoot.ts';
import { pathMatchesAnyGlob } from './pathGlobs.ts';

export const BUNDLED_TEMPLATE_CORE_PATH = '/Core/template-monorepo';
export const NESTJS_API_CORE_PATH = '/Core/nestjs-api';

export interface IRecipeDirectives {
  base: string | null;
  replaceGlobs: string[];
  corePaths: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringList(value: unknown): string[] {
  if (typeof value === 'string' && value.trim() !== '') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
  }
  return [];
}

export function parseRecipeDirectives(yamlContent: string): IRecipeDirectives {
  try {
    const parsed: unknown = parse(yamlContent);
    if (!isRecord(parsed)) {
      return { base: null, replaceGlobs: [], corePaths: [] };
    }

    let base: string | null = null;
    if (typeof parsed.$BASE === 'string' && parsed.$BASE.trim() !== '') {
      base = parsed.$BASE.trim();
    } else if (
      typeof parsed.$SOURCE === 'string' &&
      parsed.$SOURCE.trim() !== ''
    ) {
      base = parsed.$SOURCE.trim();
    } else if (
      typeof parsed.source === 'string' &&
      parsed.source.trim() !== ''
    ) {
      base = parsed.source.trim();
    }

    return {
      base,
      replaceGlobs: asStringList(parsed.replace),
      corePaths: asStringList(parsed.$USE_CORE),
    };
  } catch {
    return { base: null, replaceGlobs: [], corePaths: [] };
  }
}

export function findStructureYamlContent(
  projectYamlPath: string,
  userFiles: IStructure,
): string | null {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.slice(1)
    : projectYamlPath;
  const projectsFolder = findProjectsFolderAtRoot(userFiles);
  if (projectsFolder === undefined) {
    return null;
  }

  for (const child of projectsFolder.children) {
    if (child.type !== 'folder') {
      continue;
    }
    const structureFile = child.children.find(
      (file): file is IFile =>
        file.type === 'file' && file.name === 'structure.yaml',
    );
    if (structureFile === undefined) {
      continue;
    }
    const expectedPath = `Projects/${child.name}/structure.yaml`;
    if (normPath === expectedPath) {
      return structureFile.content;
    }
  }
  return null;
}

export function recipeUsesNestApi(corePaths: string[]): boolean {
  return corePaths.some(
    (path) => path.replace(/\/+$/, '') === NESTJS_API_CORE_PATH,
  );
}

export function replaceCoversApi(replaceGlobs: string[]): boolean {
  return (
    pathMatchesAnyGlob('apps/api', replaceGlobs) ||
    pathMatchesAnyGlob('apps/api/package.json', replaceGlobs)
  );
}
