import type { IFolder, IStructure } from '@/components/FileViewer.tsx';

function globToRegExp(glob: string): RegExp {
  const trimmed = glob.replace(/^\/+|\/+$/g, '');
  const escaped = trimmed.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withDoubleStar = escaped.replace(/\*\*/g, '::DS::');
  const withSingleStar = withDoubleStar.replace(/\*/g, '[^/]*');
  const pattern = withSingleStar.replace(/::DS::/g, '.*');
  return new RegExp(`^${pattern}$`);
}

export function pathMatchesGlob(path: string, glob: string): boolean {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  const trimmedGlob = glob.replace(/^\/+|\/+$/g, '');
  if (trimmedGlob.endsWith('/**')) {
    const prefix = trimmedGlob.slice(0, -3);
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return globToRegExp(trimmedGlob).test(normalized);
}

export function pathMatchesAnyGlob(path: string, globs: string[]): boolean {
  return globs.some((glob) => pathMatchesGlob(path, glob));
}

export function excludeGlobsFromStructure(
  structure: IStructure,
  globs: string[],
  parentPath = '',
): IStructure {
  if (globs.length === 0) {
    return structure;
  }

  const next: IStructure = [];
  for (const item of structure) {
    const itemPath =
      parentPath === '' ? item.name : `${parentPath}/${item.name}`;
    if (pathMatchesAnyGlob(itemPath, globs)) {
      continue;
    }
    if (item.type === 'folder') {
      const children = excludeGlobsFromStructure(
        item.children,
        globs,
        itemPath,
      );
      const folder: IFolder = {
        type: 'folder',
        name: item.name,
        children,
      };
      next.push(folder);
      continue;
    }
    next.push(item);
  }
  return next;
}
