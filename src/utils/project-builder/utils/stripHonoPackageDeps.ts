import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';

function isHonoDependencyName(name: string): boolean {
  return name === 'hono' || name.startsWith('@hono/');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripHonoFromDepRecord(
  value: unknown,
): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const next: Record<string, string> = {};
  for (const [name, version] of Object.entries(value)) {
    if (typeof version !== 'string') {
      continue;
    }
    if (isHonoDependencyName(name)) {
      continue;
    }
    next[name] = version;
  }
  return next;
}

export function stripHonoFromPackageJsonContent(content: string): string {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) {
      return content;
    }

    const depKeys = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ] as const;
    let changed = false;
    const next: Record<string, unknown> = { ...parsed };
    for (const key of depKeys) {
      if (!(key in parsed)) {
        continue;
      }
      const stripped = stripHonoFromDepRecord(parsed[key]);
      if (stripped === undefined) {
        continue;
      }
      const original = parsed[key];
      if (
        isRecord(original) &&
        Object.keys(original).length === Object.keys(stripped).length
      ) {
        continue;
      }
      next[key] = stripped;
      changed = true;
    }

    if (!changed) {
      return content;
    }
    return `${JSON.stringify(next, null, 2)}\n`;
  } catch {
    return content;
  }
}

export interface IStripHonoOptions {
  onlyPaths?: string[];
}

export function stripHonoFromPackageJsonFiles(
  structure: IStructure,
  options: IStripHonoOptions = {},
  parentPath = '',
): IStructure {
  return structure.map((item) => {
    const itemPath =
      parentPath === '' ? item.name : `${parentPath}/${item.name}`;
    if (item.type === 'folder') {
      const folder: IFolder = {
        type: 'folder',
        name: item.name,
        children: stripHonoFromPackageJsonFiles(
          item.children,
          options,
          itemPath,
        ),
      };
      return folder;
    }
    if (item.name !== 'package.json') {
      return item;
    }
    if (
      options.onlyPaths !== undefined &&
      !options.onlyPaths.includes(itemPath)
    ) {
      return item;
    }
    const file: IFile = {
      type: 'file',
      name: item.name,
      content: stripHonoFromPackageJsonContent(item.content),
      isBinary: item.isBinary,
    };
    return file;
  });
}

export function structureHasHonoPackageDep(
  structure: IStructure,
  parentPath = '',
): boolean {
  for (const item of structure) {
    const itemPath =
      parentPath === '' ? item.name : `${parentPath}/${item.name}`;
    if (item.type === 'folder') {
      if (structureHasHonoPackageDep(item.children, itemPath)) {
        return true;
      }
      continue;
    }
    if (item.name !== 'package.json') {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(item.content);
      if (!isRecord(parsed)) {
        continue;
      }
      for (const key of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
      ]) {
        const deps = parsed[key];
        if (!isRecord(deps)) {
          continue;
        }
        if (Object.keys(deps).some((name) => isHonoDependencyName(name))) {
          return true;
        }
      }
    } catch {
      // Skip malformed package.json; treat as no Hono dependency.
    }
  }
  return false;
}

const HONO_SOURCE_IMPORT = /(?:from|require\()\s*['"](?:hono|@hono\/)/;

function structureHasHonoSource(
  structure: IStructure,
  parentPath = '',
): boolean {
  for (const item of structure) {
    const itemPath =
      parentPath === '' ? item.name : `${parentPath}/${item.name}`;
    if (item.type === 'folder') {
      if (structureHasHonoSource(item.children, itemPath)) {
        return true;
      }
      continue;
    }
    if (HONO_SOURCE_IMPORT.test(item.content)) {
      return true;
    }
  }
  return false;
}

export function structureHasHonoApi(structure: IStructure): boolean {
  const apps = structure.find(
    (item) => item.type === 'folder' && item.name === 'apps',
  );
  if (apps?.type !== 'folder') {
    return false;
  }
  const api = apps.children.find(
    (item) => item.type === 'folder' && item.name === 'api',
  );
  if (api?.type !== 'folder') {
    return false;
  }
  return (
    structureHasHonoPackageDep(api.children, 'apps/api') ||
    structureHasHonoSource(api.children, 'apps/api')
  );
}
