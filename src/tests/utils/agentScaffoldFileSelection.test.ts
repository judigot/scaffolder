// @vitest-environment node

import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import type { IFile, IStructure } from '@/components/FileViewer.tsx';
import {
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
    name: 'tool.sh',
    content: '#!/bin/sh\nprintf "%s\\n" "ok"\n',
  };
  Reflect.set(executable, 'mode', 0o755);

  return [
    { type: 'file', name: 'README.md', content: '# app\n' },
    { type: 'file', name: '.env.example', content: 'A=1\n' },
    {
      type: 'file',
      name: 'bom.txt',
      content: '\uFEFFbom-preserved\n',
    },
    {
      type: 'folder',
      name: 'src',
      children: [
        { type: 'file', name: 'main.tsx', content: 'export {};\n' },
        { type: 'file', name: '.hidden.ts', content: 'export const hidden = true;\n' },
        {
          type: 'folder',
          name: 'nested',
          children: [executable],
        },
      ],
    },
    {
      type: 'folder',
      name: 'public',
      children: [
        {
          type: 'file',
          name: 'logo.bin',
          content: btoa(String.fromCharCode(0, 1, 2, 255)),
          isBinary: true,
        },
        { type: 'file', name: 'empty.txt', content: '' },
      ],
    },
    { type: 'folder', name: 'empty-dir', children: [] },
  ];
}

function paths(manifest: ReturnType<typeof createAgentScaffoldManifest>): {
  files: string[];
  directories: string[];
} {
  return {
    files: manifest.files.map((file) => file.path),
    directories: manifest.directories,
  };
}

describe('selectAgentScaffoldManifest', () => {
  it('preserves the complete manifest when files is omitted or ["*"]', () => {
    const manifest = createAgentScaffoldManifest(fixture());

    expect(selectAgentScaffoldManifest(manifest, undefined)).toBe(manifest);
    expect(selectAgentScaffoldManifest(manifest, ['*'])).toEqual(manifest);
  });

  it('selects exact files and includes necessary parent directories', () => {
    const selected = selectAgentScaffoldManifest(
      createAgentScaffoldManifest(fixture()),
      ['src/nested/tool.sh', 'README.md'],
    );

    expect(paths(selected)).toEqual({
      files: ['README.md', 'src/nested/tool.sh'],
      directories: ['src', 'src/nested'],
    });
  });

  it('selects recursive directories including dotfiles and nested files', () => {
    const selected = selectAgentScaffoldManifest(
      createAgentScaffoldManifest(fixture()),
      ['src/**'],
    );

    expect(paths(selected)).toEqual({
      files: ['src/.hidden.ts', 'src/main.tsx', 'src/nested/tool.sh'],
      directories: ['src', 'src/nested'],
    });
  });

  it('deduplicates overlapping selectors', () => {
    const selected = selectAgentScaffoldManifest(
      createAgentScaffoldManifest(fixture()),
      ['src/**', 'src/main.tsx', 'src/*.tsx'],
    );

    expect(paths(selected)).toEqual({
      files: ['src/.hidden.ts', 'src/main.tsx', 'src/nested/tool.sh'],
      directories: ['src', 'src/nested'],
    });
  });

  it('preserves explicitly selected empty directories', () => {
    const selected = selectAgentScaffoldManifest(
      createAgentScaffoldManifest(fixture()),
      ['empty-dir/**'],
    );

    expect(paths(selected)).toEqual({
      files: [],
      directories: ['empty-dir'],
    });
  });

  it('matches case-sensitively and reports unmatched selectors', () => {
    expect(() =>
      selectAgentScaffoldManifest(createAgentScaffoldManifest(fixture()), [
        'SRC/**',
      ]),
    ).toThrow(
      expect.objectContaining({
        code: 'FILE_SELECTOR_NO_MATCH',
        selector: 'SRC/**',
      }),
    );
  });

  it('rejects empty and unsafe or unsupported selectors', () => {
    expect(() =>
      selectAgentScaffoldManifest(createAgentScaffoldManifest(fixture()), []),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE_SELECTOR',
      }),
    );

    for (const selector of [
      '',
      ' ',
      '/src/**',
      '../src/**',
      'src/../README.md',
      'C:/src/**',
      'src\\**',
      'src/?.ts',
      'src/[ab].ts',
      'src/{a,b}.ts',
      'src/**/tool.sh',
      '**',
    ]) {
      expect(() =>
        selectAgentScaffoldManifest(createAgentScaffoldManifest(fixture()), [
          selector,
        ]),
      ).toThrow(
        expect.objectContaining({
          code: 'INVALID_FILE_SELECTOR',
          selector,
        }),
      );
    }
  });

  it('reports the exact selector that matched nothing', () => {
    expect(() =>
      selectAgentScaffoldManifest(createAgentScaffoldManifest(fixture()), [
        'README.md',
        'missing/**',
      ]),
    ).toThrow(
      expect.objectContaining({
        code: 'FILE_SELECTOR_NO_MATCH',
        selector: 'missing/**',
      }),
    );
  });

  it('preserves binary, BOM, empty-file bytes and executable modes', () => {
    const manifest = createAgentScaffoldManifest(fixture());
    const selected = selectAgentScaffoldManifest(manifest, [
      'bom.txt',
      'public/**',
      'src/nested/tool.sh',
    ]);

    for (const selectedFile of selected.files) {
      const original = manifest.files.find(
        (file) => file.path === selectedFile.path,
      );
      expect(original).toBeDefined();
      expect([...selectedFile.bytes]).toEqual([...(original?.bytes ?? [])]);
      expect(selectedFile.mode).toBe(original?.mode);
      expect(selectedFile.isBinary).toBe(original?.isBinary);
    }

    expect(
      selected.files.find((file) => file.path === 'public/empty.txt')?.bytes
        .length,
    ).toBe(0);
    expect(
      selected.files.find((file) => file.path === 'src/nested/tool.sh')?.mode,
    ).toBe(0o755);
  });

  it('extracts ZIP and scaffold.sh to the identical selected file set', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-select-'));
    const selected = selectAgentScaffoldManifest(
      createAgentScaffoldManifest(fixture()),
      ['src/**', 'public/logo.bin', 'bom.txt', 'empty-dir/**'],
    );
    const archive = join(root, 'selected.zip');
    const zipDestination = join(root, 'zip-output');
    const script = join(root, 'scaffold.sh');
    const shellDestination = join(root, 'shell-output');

    writeFileSync(archive, createAgentScaffoldZip(selected));
    mkdirSync(zipDestination);
    expect(
      spawnSync('unzip', ['-qq', archive, '-d', zipDestination]).status,
    ).toBe(0);

    writeFileSync(script, createAgentScaffoldShell(selected));
    expect(spawnSync('sh', [script, shellDestination]).status).toBe(0);

    for (const file of selected.files) {
      expect([...readFileSync(join(zipDestination, file.path))]).toEqual([
        ...readFileSync(join(shellDestination, file.path)),
      ]);
    }
    for (const directory of selected.directories) {
      expect(lstatSync(join(zipDestination, directory)).isDirectory()).toBe(
        true,
      );
      expect(lstatSync(join(shellDestination, directory)).isDirectory()).toBe(
        true,
      );
    }

    expect(
      lstatSync(join(shellDestination, 'src/nested/tool.sh')).mode & 0o777,
    ).toBe(0o755);
    expect(() => lstatSync(join(shellDestination, 'README.md'))).toThrow();
    expect(() => lstatSync(join(zipDestination, '.env.example'))).toThrow();
  });
});
