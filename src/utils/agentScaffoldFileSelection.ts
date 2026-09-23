import type { IAgentScaffoldManifest } from '@/utils/agentScaffoldExport.ts';
import { pathMatchesGlob } from '@/utils/project-builder/utils/pathGlobs.ts';

export type AgentScaffoldFileSelectionErrorCode =
  | 'INVALID_FILE_SELECTOR'
  | 'FILE_SELECTOR_NO_MATCH';

export class AgentScaffoldFileSelectionError extends Error {
  readonly code: AgentScaffoldFileSelectionErrorCode;
  readonly selector?: string;

  constructor(
    message: string,
    code: AgentScaffoldFileSelectionErrorCode,
    selector?: string,
  ) {
    super(message);
    this.name = 'AgentScaffoldFileSelectionError';
    this.code = code;
    this.selector = selector;
  }
}

export function getAgentScaffoldFileSelectorError(
  selector: string,
): string | undefined {
  if (selector.trim() === '') {
    return 'File selector must not be blank.';
  }
  if (selector.includes('\0')) {
    return 'File selector must not contain a NUL byte.';
  }
  if (selector.includes('\\')) {
    return 'File selector must use forward slashes.';
  }
  if (selector.startsWith('/') || /^[A-Za-z]:/.test(selector)) {
    return 'File selector must be relative to the generated project root.';
  }
  if (/[?\[\]{}()!]/.test(selector)) {
    return 'File selector uses unsupported glob syntax. Only * and a trailing /** are supported.';
  }

  const segments = selector.split('/');
  if (
    segments.length === 0 ||
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return 'File selector must not contain empty, current-directory, or parent-directory segments.';
  }

  const firstDoubleStar = selector.indexOf('**');
  if (
    firstDoubleStar !== -1 &&
    (!selector.endsWith('/**') ||
      selector.slice(0, -3).includes('**') ||
      selector === '**')
  ) {
    return 'Recursive ** is supported only as the final /** path segment.';
  }

  return undefined;
}

function addParentDirectories(
  path: string,
  selectedDirectories: Set<string>,
  sourceDirectories: Set<string>,
  includePath = false,
): void {
  const segments = path.split('/');
  if (!includePath) segments.pop();

  while (segments.length > 0) {
    const parent = segments.join('/');
    if (sourceDirectories.has(parent)) {
      selectedDirectories.add(parent);
    }
    segments.pop();
  }
}

export function selectAgentScaffoldManifest(
  manifest: IAgentScaffoldManifest,
  selectors: string[] | undefined,
): IAgentScaffoldManifest {
  if (selectors === undefined) {
    return manifest;
  }
  if (selectors.length === 0) {
    throw new AgentScaffoldFileSelectionError(
      'files must contain at least one selector.',
      'INVALID_FILE_SELECTOR',
    );
  }

  const selectedFiles = new Set<string>();
  const selectedDirectories = new Set<string>();

  for (const selector of selectors) {
    const validationError = getAgentScaffoldFileSelectorError(selector);
    if (validationError !== undefined) {
      throw new AgentScaffoldFileSelectionError(
        validationError,
        'INVALID_FILE_SELECTOR',
        selector,
      );
    }

    let matched = false;
    if (selector === '*') {
      matched = manifest.files.length > 0 || manifest.directories.length > 0;
      for (const file of manifest.files) selectedFiles.add(file.path);
      for (const directory of manifest.directories) {
        selectedDirectories.add(directory);
      }
    } else {
      for (const file of manifest.files) {
        if (pathMatchesGlob(file.path, selector)) {
          matched = true;
          selectedFiles.add(file.path);
        }
      }
      for (const directory of manifest.directories) {
        if (pathMatchesGlob(directory, selector)) {
          matched = true;
          selectedDirectories.add(directory);
        }
      }
    }

    if (!matched) {
      throw new AgentScaffoldFileSelectionError(
        `File selector matched nothing: ${selector}`,
        'FILE_SELECTOR_NO_MATCH',
        selector,
      );
    }
  }

  const sourceDirectories = new Set(manifest.directories);
  for (const filePath of selectedFiles) {
    addParentDirectories(filePath, selectedDirectories, sourceDirectories);
  }
  for (const directoryPath of [...selectedDirectories]) {
    addParentDirectories(
      directoryPath,
      selectedDirectories,
      sourceDirectories,
      true,
    );
  }

  const files = manifest.files.filter((file) => selectedFiles.has(file.path));
  const directories = manifest.directories.filter((directory) =>
    selectedDirectories.has(directory),
  );

  return {
    files,
    directories,
    totalBytes: files.reduce((total, file) => total + file.bytes.length, 0),
  };
}
