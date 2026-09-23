import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import { type Zippable, zipSync } from 'fflate';

export type AgentScaffoldFileMode = 0o644 | 0o755;

export interface IAgentScaffoldManifestFile {
  path: string;
  bytes: Uint8Array;
  mode: AgentScaffoldFileMode;
  isBinary: boolean;
}

export interface IAgentScaffoldManifest {
  files: IAgentScaffoldManifestFile[];
  directories: string[];
  totalBytes: number;
}

export const AGENT_SCAFFOLD_MAX_EXPORT_FILES = 10_000;
export const AGENT_SCAFFOLD_MAX_EXPORT_BYTES = 25 * 1024 * 1024;

export class AgentScaffoldExportError extends Error {
  readonly code: 'INVALID_EXPORT_PATH' | 'EXPORT_LIMIT_EXCEEDED';

  constructor(
    message: string,
    code: 'INVALID_EXPORT_PATH' | 'EXPORT_LIMIT_EXCEEDED',
  ) {
    super(message);
    this.name = 'AgentScaffoldExportError';
    this.code = code;
  }
}

const FIXED_ZIP_MTIME = new Date('1980-01-01T00:00:00.000Z');

function normalizeExportPath(path: string): string {
  if (path.includes('\0')) {
    throw new AgentScaffoldExportError(
      'Generated path contains a NUL byte.',
      'INVALID_EXPORT_PATH',
    );
  }

  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new AgentScaffoldExportError(
      `Generated path must be repository-relative: ${path}`,
      'INVALID_EXPORT_PATH',
    );
  }

  const segments = normalized.split('/');
  if (
    segments.length === 0 ||
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    throw new AgentScaffoldExportError(
      `Generated path is unsafe: ${path}`,
      'INVALID_EXPORT_PATH',
    );
  }
  return segments.join('/');
}

function base64ToBytes(value: string): Uint8Array {
  let decoded: string;
  try {
    decoded = atob(value);
  } catch {
    throw new AgentScaffoldExportError(
      'Generated binary file contains invalid base64 data.',
      'INVALID_EXPORT_PATH',
    );
  }
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function resolveMode(file: IFile): AgentScaffoldFileMode {
  return Reflect.get(file, 'mode') === 0o755 ? 0o755 : 0o644;
}

export function createAgentScaffoldManifest(
  structure: IStructure,
): IAgentScaffoldManifest {
  const files: IAgentScaffoldManifestFile[] = [];
  const directories = new Set<string>();
  const occupied = new Map<string, 'file' | 'directory'>();
  let totalBytes = 0;

  const claim = (path: string, kind: 'file' | 'directory'): string => {
    const normalized = normalizeExportPath(path);
    const existing = occupied.get(normalized);
    if (existing !== undefined) {
      throw new AgentScaffoldExportError(
        `Generated path collision at ${normalized} (${existing} vs ${kind}).`,
        'INVALID_EXPORT_PATH',
      );
    }
    const segments = normalized.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      const ancestor = segments.slice(0, index).join('/');
      if (occupied.get(ancestor) === 'file') {
        throw new AgentScaffoldExportError(
          `Generated path ${normalized} is nested below file ${ancestor}.`,
          'INVALID_EXPORT_PATH',
        );
      }
    }
    const descendantPrefix = `${normalized}/`;
    for (const claimedPath of occupied.keys()) {
      if (claimedPath.startsWith(descendantPrefix)) {
        throw new AgentScaffoldExportError(
          `Generated path collision between ${normalized} and ${claimedPath}.`,
          'INVALID_EXPORT_PATH',
        );
      }
    }
    occupied.set(normalized, kind);
    return normalized;
  };

  const visit = (items: IStructure, prefix: string): void => {
    for (const item of items) {
      const rawPath = prefix === '' ? item.name : `${prefix}/${item.name}`;
      if (item.type === 'folder') {
        const path = claim(rawPath, 'directory');
        directories.add(path);
        visit(item.children, path);
        continue;
      }

      const path = claim(rawPath, 'file');
      const bytes =
        item.isBinary === true
          ? base64ToBytes(item.content)
          : new TextEncoder().encode(item.content);
      totalBytes += bytes.length;
      files.push({
        path,
        bytes,
        mode: resolveMode(item),
        isBinary: item.isBinary === true,
      });

      if (files.length > AGENT_SCAFFOLD_MAX_EXPORT_FILES) {
        throw new AgentScaffoldExportError(
          `Generated project exceeds the ${String(AGENT_SCAFFOLD_MAX_EXPORT_FILES)} file export limit.`,
          'EXPORT_LIMIT_EXCEEDED',
        );
      }
      if (totalBytes > AGENT_SCAFFOLD_MAX_EXPORT_BYTES) {
        throw new AgentScaffoldExportError(
          `Generated project exceeds the ${String(AGENT_SCAFFOLD_MAX_EXPORT_BYTES)} byte export limit.`,
          'EXPORT_LIMIT_EXCEEDED',
        );
      }
    }
  };

  visit(structure, '');

  return {
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
    directories: [...directories].sort((left, right) =>
      left.localeCompare(right),
    ),
    totalBytes,
  };
}

export function agentScaffoldManifestToStructure(
  manifest: IAgentScaffoldManifest,
): IStructure {
  const root: IFolder = { name: '', type: 'folder', children: [] };
  const folders = new Map<string, IFolder>([['', root]]);

  const ensureFolder = (path: string): IFolder => {
    const existing = folders.get(path);
    if (existing !== undefined) return existing;

    const segments = path.split('/');
    const name = segments.pop();
    if (name === undefined || name === '') return root;

    const parent = ensureFolder(segments.join('/'));
    const folder: IFolder = { name, type: 'folder', children: [] };
    parent.children.push(folder);
    folders.set(path, folder);
    return folder;
  };

  for (const directory of manifest.directories) ensureFolder(directory);

  for (const file of manifest.files) {
    const segments = file.path.split('/');
    const name = segments.pop();
    if (name === undefined || name === '') continue;
    const parent = ensureFolder(segments.join('/'));
    const outputFile: IFile = {
      name,
      type: 'file',
      content: file.isBinary
        ? bytesToBase64(file.bytes)
        : new TextDecoder().decode(file.bytes),
      isBinary: file.isBinary || undefined,
    };
    if (file.mode === 0o755) Reflect.set(outputFile, 'mode', 0o755);
    parent.children.push(outputFile);
  }

  const sortItems = (items: IStructure): void => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      if (item.type === 'folder') sortItems(item.children);
    }
  };
  sortItems(root.children);
  return root.children;
}

export function createAgentScaffoldZip(
  manifest: IAgentScaffoldManifest,
): Uint8Array {
  const content: Zippable = {};

  for (const directory of manifest.directories) {
    content[directory] = [
      {},
      { level: 0, mtime: FIXED_ZIP_MTIME, os: 3, attrs: 0o755 << 16 },
    ];
  }

  for (const file of manifest.files) {
    content[file.path] =
      file.mode === 0o755
        ? [
            file.bytes,
            {
              level: 6,
              mtime: FIXED_ZIP_MTIME,
              os: 3,
              attrs: 0o755 << 16,
            },
          ]
        : file.bytes;
  }

  return zipSync(content, {
    level: 6,
    mtime: FIXED_ZIP_MTIME,
    os: 3,
    attrs: 0o644 << 16,
  });
}

export function createAgentScaffoldShell(
  manifest: IAgentScaffoldManifest,
): string {
  const zipBase64 = bytesToBase64(createAgentScaffoldZip(manifest));
  const wrapped = zipBase64.match(/.{1,76}/g)?.join('\n') ?? '';

  return `#!/bin/sh
set -eu

fail() {
  printf '%s\\n' "scaffold.sh: $*" >&2
  exit 2
}

[ "$#" -eq 1 ] || fail "expected exactly one destination argument"
dest=$1
[ -n "$dest" ] || fail "destination must not be empty"

if [ -L "$dest" ]; then
  fail "destination must not be a symlink"
fi

had_empty_dest=0
if [ -e "$dest" ]; then
  [ -d "$dest" ] || fail "destination already exists and is not a directory"
  for entry in "$dest"/.[!.]* "$dest"/..?* "$dest"/*; do
    if [ -e "$entry" ] || [ -L "$entry" ]; then
      fail "destination directory must be empty"
    fi
  done
  had_empty_dest=1
fi

parent=$(dirname "$dest")
mkdir -p "$parent"
stage=$(mktemp -d "$parent/.scaffolder.XXXXXX") || fail "mktemp is required"
archive="$stage/project.zip"
payload="$stage/project.zip.b64"
project="$stage/project"

cleanup() {
  rm -rf "$stage"
}
trap cleanup 0 1 2 15

cat > "$payload" <<'SCAFFOLDER_ZIP'
${wrapped}
SCAFFOLDER_ZIP

if base64 -d < "$payload" > "$archive" 2>/dev/null; then
  :
elif base64 -D < "$payload" > "$archive" 2>/dev/null; then
  :
else
  fail "a base64 command supporting -d (GNU) or -D (BSD/macOS) is required"
fi

command -v unzip >/dev/null 2>&1 || fail "unzip is required"
mkdir "$project"
unzip -qq "$archive" -d "$project" || fail "failed to extract embedded project archive"

if [ "$had_empty_dest" -eq 1 ]; then
  rmdir "$dest" || fail "failed to prepare empty destination"
fi

mv "$project" "$dest" || fail "failed to move staged project into destination"
rm -rf "$stage"
trap - 0 1 2 15
exit 0
`;
}
