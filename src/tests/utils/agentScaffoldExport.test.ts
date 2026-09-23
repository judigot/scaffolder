// @vitest-environment node

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
import {
  AgentScaffoldFileSelectionError,
  selectAgentScaffoldManifest,
} from '@/utils/agentScaffoldFileSelection.ts';

function fixture(): IStructure {
  const executable: IFile = {
    type: 'file',
    name: 'run me.sh',
    content: '#!/bin/sh\\nprintf "%s\\n" "ok"\\n',
  };
  Reflect.set(executable, 'mode', 0o755);

  return [
    { type: 'file', name: '.env.example', content: 'A=$HOME\\n' },
    { type: 'file', name: 'bom.txt', content: '\uFEFFbom-preserved\\n' },
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
        { type: 'file', name: '.nested', content: 'hidden' },
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

  it('extracts ZIP and scaffold.sh to identical bytes and executable mode', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-'));
    const manifest = createAgentScaffoldManifest(fixture());
    const archive = join(root, 'scaffold.zip');
    const zipDestination = join(root, 'zip-output');
    const script = join(root, 'scaffold.sh');
    const shellDestination = join(root, 'shell-output');

    writeFileSync(archive, createAgentScaffoldZip(manifest));
    mkdirSync(zipDestination);
    const unzipResult = spawnSync(
      'unzip',
      ['-qq', archive, '-d', zipDestination],
      { encoding: 'utf8' },
    );
    expect(unzipResult.status).toBe(0);

    writeFileSync(script, createAgentScaffoldShell(manifest));
    const shellResult = spawnSync('sh', [script, shellDestination], {
      encoding: 'utf8',
    });
    expect(shellResult.status).toBe(0);

    for (const relativePath of [
      '.env.example',
      'bom.txt',
      'empty.txt',
      'binary.bin',
      'dir with spaces/run me.sh',
      'dir with spaces/.nested',
      'dir with spaces/$(not-run).txt',
    ]) {
      expect([
        ...readFileSync(join(zipDestination, relativePath)),
      ]).toEqual([
        ...readFileSync(join(shellDestination, relativePath)),
      ]);
    }

    expect(
      lstatSync(join(zipDestination, 'dir with spaces', 'run me.sh')).mode &
        0o777,
    ).toBe(0o755);
    expect(
      lstatSync(join(shellDestination, 'dir with spaces', 'run me.sh')).mode &
        0o777,
    ).toBe(0o755);
  });

  it('keeps omitted files and the whole-project selector identical', () => {
    const manifest = createAgentScaffoldManifest(fixture());

    expect(selectAgentScaffoldManifest(manifest)).toEqual(manifest);
    expect(selectAgentScaffoldManifest(manifest, ['*'])).toEqual(manifest);
  });

  it('selects exact files, recursive directories and dotfiles without duplicates', () => {
    const manifest = createAgentScaffoldManifest(fixture());
    const selected = selectAgentScaffoldManifest(manifest, [
      'bom.txt',
      'binary.bin',
      'empty.txt',
      'dir with spaces/**',
      'dir with spaces/run me.sh',
    ]);

    expect(selected.files.map((file) => file.path)).toEqual([
      'binary.bin',
      'bom.txt',
      'dir with spaces/$(not-run).txt',
      'dir with spaces/.nested',
      'dir with spaces/run me.sh',
      'empty.txt',
    ]);
    expect(selected.directories).toEqual(['dir with spaces']);
    expect(new Set(selected.files.map((file) => file.path)).size).toBe(
      selected.files.length,
    );

    const executable = selected.files.find(
      (file) => file.path === 'dir with spaces/run me.sh',
    );
    expect(executable?.mode).toBe(0o755);
    expect([
      ...(selected.files.find((file) => file.path === 'binary.bin')?.bytes ??
        []),
    ]).toEqual([0, 1, 2, 255]);
    expect([
      ...(selected.files.find((file) => file.path === 'bom.txt')?.bytes ?? []),
    ]).toEqual([
      ...new TextEncoder().encode('\uFEFFbom-preserved\\n'),
    ]);
  });

  it('preserves selected empty directories and their parents', () => {
    const manifest = createAgentScaffoldManifest([
      ...fixture(),
      {
        type: 'folder',
        name: 'parent',
        children: [{ type: 'folder', name: 'empty-child', children: [] }],
      },
    ]);
    const selected = selectAgentScaffoldManifest(manifest, [
      'parent/empty-child/**',
    ]);

    expect(selected.files).toEqual([]);
    expect(selected.directories).toEqual(['parent', 'parent/empty-child']);
    expect(Object.keys(unzipSync(createAgentScaffoldZip(selected)))).toEqual(
      expect.arrayContaining(['parent/', 'parent/empty-child/']),
    );
  });

  it('rejects invalid and unmatched selectors with the offending selector', () => {
    const manifest = createAgentScaffoldManifest(fixture());

    for (const selector of [
      '',
      ' ',
      '/absolute',
      '../escape',
      'src/../escape',
      'C:\\absolute',
      'src\\main.tsx',
      'src/[ab].ts',
      'src/file?.ts',
      'src/{a,b}.ts',
      'src/+(a).ts',
      'src/**/nested.ts',
    ]) {
      expect(() => selectAgentScaffoldManifest(manifest, [selector])).toThrow(
        AgentScaffoldFileSelectionError,
      );
    }

    expect(() => selectAgentScaffoldManifest(manifest, [])).toThrow(
      /at least one selector/,
    );

    try {
      selectAgentScaffoldManifest(manifest, ['missing/**']);
      throw new Error('Expected unmatched selector to fail');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AgentScaffoldFileSelectionError);
      if (error instanceof AgentScaffoldFileSelectionError) {
        expect(error.code).toBe('UNMATCHED_FILE_SELECTOR');
        expect(error.selector).toBe('missing/**');
      }
    }
  });

  it('extracts ZIP and shell to the identical selected file set', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-selected-'));
    const manifest = createAgentScaffoldManifest(fixture());
    const selected = selectAgentScaffoldManifest(manifest, [
      'bom.txt',
      'binary.bin',
      'empty.txt',
      'dir with spaces/run me.sh',
      'dir with spaces/.nested',
    ]);
    const archive = join(root, 'selected.zip');
    const zipDestination = join(root, 'zip-output');
    const script = join(root, 'selected.sh');
    const shellDestination = join(root, 'shell-output');

    writeFileSync(archive, createAgentScaffoldZip(selected));
    mkdirSync(zipDestination);
    expect(
      spawnSync('unzip', ['-qq', archive, '-d', zipDestination]).status,
    ).toBe(0);

    writeFileSync(script, createAgentScaffoldShell(selected));
    expect(spawnSync('sh', [script, shellDestination]).status).toBe(0);

    for (const relativePath of selected.files.map((file) => file.path)) {
      expect([...readFileSync(join(zipDestination, relativePath))]).toEqual([
        ...readFileSync(join(shellDestination, relativePath)),
      ]);
    }

    expect(existsSync(join(zipDestination, '.env.example'))).toBe(false);
    expect(existsSync(join(shellDestination, '.env.example'))).toBe(false);
    expect(
      existsSync(join(zipDestination, 'dir with spaces', '$(not-run).txt')),
    ).toBe(false);
    expect(
      existsSync(join(shellDestination, 'dir with spaces', '$(not-run).txt')),
    ).toBe(false);
    expect(
      lstatSync(join(zipDestination, 'dir with spaces', 'run me.sh')).mode &
        0o777,
    ).toBe(0o755);
    expect(
      lstatSync(join(shellDestination, 'dir with spaces', 'run me.sh')).mode &
        0o777,
    ).toBe(0o755);
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
      /(<<'SCAFFOLDER_ZIP'\n)[A-Za-z0-9+/]/,
      '$1!',
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

  it('rejects unsafe, normalized duplicate and file-directory collisions', () => {
    for (const unsafeName of ['../escape', '/absolute', 'C:\\absolute']) {
      expect(() =>
        createAgentScaffoldManifest([
          { type: 'file', name: unsafeName, content: 'x' },
        ]),
      ).toThrow(AgentScaffoldExportError);
    }

    expect(() =>
      createAgentScaffoldManifest([
        { type: 'file', name: 'dir\\file.txt', content: 'one' },
        { type: 'file', name: 'dir/file.txt', content: 'two' },
      ]),
    ).toThrow(/collision/);

    expect(() =>
      createAgentScaffoldManifest([
        { type: 'file', name: 'same', content: 'x' },
        { type: 'folder', name: 'same', children: [] },
      ]),
    ).toThrow(/collision/);

    expect(() =>
      createAgentScaffoldManifest([
        { type: 'file', name: 'same/child.txt', content: 'x' },
        { type: 'folder', name: 'same', children: [] },
      ]),
    ).toThrow(/collision/);
  });

  it('requires exactly one shell destination argument', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-scaffold-'));
    const script = join(root, 'scaffold.sh');
    writeFileSync(
      script,
      createAgentScaffoldShell(createAgentScaffoldManifest(fixture())),
    );

    expect(spawnSync('sh', [script]).status).not.toBe(0);
    expect(spawnSync('sh', [script, 'one', 'two']).status).not.toBe(0);
  });
});
