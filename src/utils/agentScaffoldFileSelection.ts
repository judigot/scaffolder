import type { IAgentScaffoldManifest } from '@/utils/agentScaffoldExport.ts';
import { pathMatchesGlob } from '@/utils/project-builder/utils/pathGlobs.ts';

export type AgentScaffoldFileSelectionErrorCode =
  | 'INVALID_FILE_SELECTOR'
  | 'UNMATCHED_FILE_SELECTOR';

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
  if (selector.trim().length === 0) {
    return 'File selector must not be blank.';
  }
  if (selector === '*') {
    return undefined;
  }
  if (selector === '**') {
    return 'Use "*" to select the entire project; recursive ** requires a directory prefix.';
  }
  if (selector.includes('\0')) {
    return 'File selector must not contain a NUL byte.';
  }
  if (selector.startsWith('/') || /^[A-Za-z]:/.test(selector)) {
    return 'File selector must be relative to the generated project root.';
  }
  if (selector.includes('\\')) {
    return 'File selector must use "/" as the path separator.';
  }
  if (
    /[?\[\]{}!]/.test(selector) ||
    /(?:^|[/])[^/]*[+@*]\(/.test(selector)
  ) {
    return 'File selector uses unsupported glob syntax. Supported wildcards are * and trailing /**.';
  }

  const segments = selector.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return 'File selector must not contain empty, current-directory, or traversal segments.';
  }

  for (const [index, segment] of segments.entries()) {
    if (!segment.includes('**')) continue;
    const isTrailingGlobstar =
      segment === '**' && index === segments.length - 1;
    if (!isTrailingGlobstar) {
      return 'Recursive ** is only supported as the final path segment (for example src/**).';
    }
  }

  return undefined;
}

function addParentDirectories(
  path: string,
  availableDirectories: ReadonlySet<string>,
  selectedDirectories: Set<string>,
): void {
  const segments = path.split('/');
  segments.pop();
  while (segments.length > 0) {
    const parent = segments.join('/');
    if (availableDirectories.has(parent)) {
      selectedDirectories.add(parent);
    }
    segments.pop();
  }
}

export function selectAgentScaffoldManifest(
  manifest: IAgentScaffoldManifest,
  selectors?: string[],
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

  for (const selector of selectors) {
    const validationError = getAgentScaffoldFileSelectorError(selector);
    if (validationError !== undefined) {
      throw new AgentScaffoldFileSelectionError(
        validationError,
        'INVALID_FILE_SELECTOR',
        selector,
      );
    }
  }

  const availableDirectories = new Set(manifest.directories);
  const selectedFiles = new Set<string>();
  const selectedDirectories = new Set<string>();

  for (const selector of selectors) {
    let matched = selector === '*';
    const matches = (path: string): boolean =>
      selector === '*' || pathMatchesGlob(path, selector);

    for (const file of manifest.files) {
      if (!matches(file.path)) continue;
      matched = true;
      selectedFiles.add(file.path);
      addParentDirectories(
        file.path,
        availableDirectories,
        selectedDirectories,
      );
    }

    for (const directory of manifest.directories) {
      if (!matches(directory)) continue;
      matched = true;
      selectedDirectories.add(directory);
      addParentDirectories(
        directory,
        availableDirectories,
        selectedDirectories,
      );
    }

    if (!matched) {
      throw new AgentScaffoldFileSelectionError(
        `File selector matched no generated paths: ${selector}`,
        'UNMATCHED_FILE_SELECTOR',
        selector,
      );
    }
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
