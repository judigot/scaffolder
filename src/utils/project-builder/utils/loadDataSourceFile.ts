import type { IStructure } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import {
  flattenData,
  isRecord,
} from '@/utils/project-builder/utils/dataSourceUtils.ts';
import type { DataContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import {
  isPathRelative,
  getProjectDirectory,
} from '@/utils/project-builder/utils/processRelativePath.ts';

/**
 * Extracts namespace from file path (e.g., "/Constants/typeMappings.yaml" → "typeMappings")
 */
const extractNamespace = (filePath: string): string => {
  const fileName = filePath.split('/').pop() ?? filePath;
  // Remove extension (.yaml, .yml, .json, etc.)
  return fileName.replace(/\.[^.]+$/, '');
};

const loadSingleDataSourceFile = (
  dataSourcePath: string,
  userFiles: IStructure,
  projectYamlPath?: string,
): { namespace: string; data: DataContext } | null => {
  let resolvedPath = dataSourcePath.trim();

  if (
    isPathRelative(resolvedPath) &&
    projectYamlPath !== undefined &&
    projectYamlPath !== ''
  ) {
    const projectDir = getProjectDirectory(projectYamlPath);
    const normalizedPath = resolvedPath.startsWith('./')
      ? resolvedPath.substring(2)
      : resolvedPath;
    resolvedPath = `${projectDir}/${normalizedPath}`;
  }

  const file = findFileInStructure(resolvedPath, userFiles);
  if (!file) {
    return null;
  }

  try {
    const parsed: unknown = parse(file.content);
    if (!isRecord(parsed)) {
      return null;
    }

    const namespace = extractNamespace(dataSourcePath);
    const flatData = flattenData(parsed);
    return { namespace, data: { ...parsed, ...flatData } };
  } catch {
    return null;
  }
};

export const loadDataSourceFile = (
  dataSourcePath: string,
  userFiles: IStructure,
  projectYamlPath?: string,
): DataContext | null => {
  const paths = dataSourcePath.split(',').map((p) => p.trim());

  const mergedContext: DataContext = {};

  for (const path of paths) {
    const result = loadSingleDataSourceFile(path, userFiles, projectYamlPath);
    if (result) {
      // Namespace the data source (e.g., typeMappings.yaml → { typeMappings: {...} })
      mergedContext[result.namespace] = result.data;
      // Also merge flat data at root level for backwards compatibility
      Object.assign(mergedContext, result.data);
    }
  }

  return Object.keys(mergedContext).length > 0 ? mergedContext : null;
};
