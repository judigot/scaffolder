import { describe, expect, it } from 'vitest';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';
import type { IFile, IStructure } from '@/components/FileViewer.tsx';
import {
  AgentScaffoldExportError,
  agentScaffoldManifestToStructure,
  AGENT_SCAFFOLD_MAX_EXPORT_BYTES,
  AGENT_SCAFFOLD_MAX_EXPORT_FILES,
  createAgentScaffoldManifest,
  createAgentScaffoldShell,
  createAgentScaffoldZip,
} from '@/utils/agentScaffoldExport.ts';

function fixture(): IStructure {
  const executable: IFile = {
    type: 'file',
    name: 'run me.sh',
    content: '#!/bin/sh\\nprintf "%s\\n" "ok"\\n',
  };
  Reflect.set(executable, 'mode', 0o755);

  return [
    { type: 'file', name: '.env.example', content: 'A=$HOME\\n' },
    { type: 'file', name: 'empty.txt', content: '' },
    {
      type: 'file',
      name: 'binary.bin',
      content: btoa(String.fromCharCode(0, 1, 2, 255)),
      isBinary: true,
    },
    {
      type: 'folder',
      name: 'dir with spaces',
      children: [
        executable,
        { type: 'file', name: '$(not-run).txt', content: '`echo nope`' },
      ],
    },
    { type: 'folder', name: 'empty-dir', children: [] },
  ];
}

describe('agent scaffold exports', () => {
  it('round-trips exact bytes, directories and executable mode metadata', () => {
    const manifest = createAgentScaffoldManifest(fixture());
    const rebuilt = createAgentScaffoldManifest(
      agentScaffoldManifestToStructure(manifest),
    );

    expect(
      rebuilt.files.map((file) => ({
        path: file.path,
        bytes: [...file.bytes],
        mode: file.mode,
      })),
    ).toEqual(
      manifest.files.map((file) => ({
        path: file.path,
        bytes: [...file.bytes],
        mode: file.mode,
      })),
    );
    expect(rebuilt.directories).toEqual(manifest.directories);
  });

  it('creates a ZIP with binary, empty, dotfile and empty-directory parity', () => {
    const extracted = unzipSync(
      createAgentScaffoldZip(createAgentScaffoldManifest(fixture())),
    );

    expect([...extracted['binary.bin']]).toEqual([0, 1, 2, 255]);
    expect(new TextDecoder().decode(extracted['.env.example'])).toBe(
      'A=$HOME\\n',
    );
    expect(extracted['empty.txt'].length).toBe(0);
    expect(Object.keys(extracted)).toContain('empty-dir/');
  });

  it('executes scaffold.sh offline with spaces and shell metacharacters', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-'));
    const script = join(root, 'scaffold.sh');
    const destination = join(root, 'my app;$(never)');
    writeFileSync(
      script,
      createAgentScaffoldShell(createAgentScaffoldManifest(fixture())),
    );
    chmodSync(script, 0o755);

    const result = spawnSync('sh', [script, destination], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(readFileSync(join(destination, '.env.example'), 'utf8')).toBe(
      'A=$HOME\\n',
    );
    expect([...readFileSync(join(destination, 'binary.bin'))]).toEqual([
      0, 1, 2, 255,
    ]);
    expect(
      lstatSync(join(destination, 'dir with spaces', 'run me.sh')).mode & 0o777,
    ).toBe(0o755);
  });

  it('refuses nonempty and symlink destinations', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-'));
    const script = join(root, 'scaffold.sh');
    writeFileSync(
      script,
      createAgentScaffoldShell(createAgentScaffoldManifest(fixture())),
    );

    const nonempty = join(root, 'nonempty');
    mkdirSync(nonempty);
    writeFileSync(join(nonempty, 'keep.txt'), 'keep');
    const symlink = join(root, 'link');
    symlinkSync(nonempty, symlink);

    expect(spawnSync('sh', [script, nonempty]).status).not.toBe(0);
    expect(readFileSync(join(nonempty, 'keep.txt'), 'utf8')).toBe('keep');
    expect(spawnSync('sh', [script, symlink]).status).not.toBe(0);
  });

  it('cleans staging and leaves no destination when extraction fails', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-'));
    const script = join(root, 'broken-scaffold.sh');
    const destination = join(root, 'result');
    const generated = createAgentScaffoldShell(
      createAgentScaffoldManifest(fixture()),
    );
    const corrupted = generated.replace(
      /SCAFFOLDER_ZIP\n[A-Za-z0-9+/]/,
      'SCAFFOLDER_ZIP\n!',
    );
    writeFileSync(script, corrupted);

    const result = spawnSync('sh', [script, destination], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(existsSync(destination)).toBe(false);
  });

  it('enforces file-count and uncompressed-byte limits', () => {
    const tooMany: IStructure = Array.from(
      { length: AGENT_SCAFFOLD_MAX_EXPORT_FILES + 1 },
      (_, index) => ({
        type: 'file' as const,
        name: `file-${String(index)}`,
        content: '',
      }),
    );
    expect(() => createAgentScaffoldManifest(tooMany)).toThrow(
      /file export limit/,
    );

    expect(() =>
      createAgentScaffoldManifest([
        {
          type: 'file',
          name: 'oversized.bin',
          content: 'x'.repeat(AGENT_SCAFFOLD_MAX_EXPORT_BYTES + 1),
        },
      ]),
    ).toThrow(/byte export limit/);
  });

  it('rejects traversal and file-directory collisions', () => {
    expect(() =>
      createAgentScaffoldManifest([
        { type: 'file', name: '../escape', content: 'x' },
      ]),
    ).toThrow(AgentScaffoldExportError);

    expect(() =>
      createAgentScaffoldManifest([
        { type: 'file', name: 'same', content: 'x' },
        { type: 'folder', name: 'same', children: [] },
      ]),
    ).toThrow(/collision/);
  });
});
