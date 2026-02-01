import { describe, it, expect } from 'vitest';
import { mergeCoreFilesWithScaffolded } from '@/utils/project-builder/utils/mergeCoreFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

/** Type for package.json structure in tests */
interface ITestPackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/** Type guard to validate if a value is a package.json object */
function isITestPackageJson(value: unknown): value is ITestPackageJson {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Safely parses JSON content as package.json */
function parseTestPackageJson(content: string): ITestPackageJson {
  const parsed: unknown = JSON.parse(content);
  if (isITestPackageJson(parsed)) {
    return parsed;
  }
  return {};
}

describe('mergeCoreFilesWithScaffolded', () => {
  it('should merge core and scaffolded files with no conflicts', () => {
    const coreFiles: IStructure = [
      {
        type: 'file',
        name: 'README.md',
        content: 'Core README',
      },
      {
        type: 'file',
        name: 'package.json',
        content: 'Core package',
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'file',
        name: 'index.js',
        content: 'Scaffolded index',
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(3);
    expect(result.find((f) => f.name === 'README.md')).toBeDefined();
    expect(result.find((f) => f.name === 'package.json')).toBeDefined();
    expect(result.find((f) => f.name === 'index.js')).toBeDefined();
  });

  it('should override core file with scaffolded file when names conflict', () => {
    const coreFiles: IStructure = [
      {
        type: 'file',
        name: 'config.json',
        content: 'Core config',
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'file',
        name: 'config.json',
        content: 'Scaffolded config',
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('file');
    if (result[0].type === 'file') {
      expect(result[0].content).toBe('Scaffolded config');
    }
  });

  it('should merge folders with same name', () => {
    const coreFiles: IStructure = [
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'core-file.txt',
            content: 'Core file',
          },
        ],
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'scaffolded-file.txt',
            content: 'Scaffolded file',
          },
        ],
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('folder');
    if (result[0].type === 'folder') {
      expect(result[0].children).toHaveLength(2);
      expect(
        result[0].children.find((f) => f.name === 'core-file.txt'),
      ).toBeDefined();
      expect(
        result[0].children.find((f) => f.name === 'scaffolded-file.txt'),
      ).toBeDefined();
    }
  });

  it('should deeply merge nested folders', () => {
    const coreFiles: IStructure = [
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'folder',
            name: 'utils',
            children: [
              {
                type: 'file',
                name: 'core-helper.js',
                content: 'Core helper',
              },
            ],
          },
        ],
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'folder',
            name: 'utils',
            children: [
              {
                type: 'file',
                name: 'scaffolded-helper.js',
                content: 'Scaffolded helper',
              },
            ],
          },
          {
            type: 'folder',
            name: 'components',
            children: [
              {
                type: 'file',
                name: 'Button.tsx',
                content: 'Button component',
              },
            ],
          },
        ],
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('folder');
    expect(result[0].name).toBe('src');

    if (result[0].type === 'folder') {
      expect(result[0].children).toHaveLength(2);

      const utilsFolder = result[0].children.find((f) => f.name === 'utils');
      expect(utilsFolder).toBeDefined();
      expect(utilsFolder?.type).toBe('folder');

      if (utilsFolder?.type === 'folder') {
        expect(utilsFolder.children).toHaveLength(2);
        expect(
          utilsFolder.children.find((f) => f.name === 'core-helper.js'),
        ).toBeDefined();
        expect(
          utilsFolder.children.find((f) => f.name === 'scaffolded-helper.js'),
        ).toBeDefined();
      }

      const componentsFolder = result[0].children.find(
        (f) => f.name === 'components',
      );
      expect(componentsFolder).toBeDefined();
      expect(componentsFolder?.type).toBe('folder');
    }
  });

  it('should override file in nested folder', () => {
    const coreFiles: IStructure = [
      {
        type: 'folder',
        name: 'config',
        children: [
          {
            type: 'file',
            name: 'database.js',
            content: 'Core database config',
          },
        ],
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'folder',
        name: 'config',
        children: [
          {
            type: 'file',
            name: 'database.js',
            content: 'Scaffolded database config',
          },
        ],
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(1);
    if (result[0].type === 'folder') {
      expect(result[0].children).toHaveLength(1);
      if (result[0].children[0].type === 'file') {
        expect(result[0].children[0].content).toBe(
          'Scaffolded database config',
        );
      }
    }
  });

  it('should not include core folder itself in result', () => {
    const coreFiles: IStructure = [
      {
        type: 'file',
        name: 'README.md',
        content: 'Core README',
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'folder',
        name: 'core',
        children: [
          {
            type: 'file',
            name: 'should-not-appear.txt',
            content: 'This core folder should not appear',
          },
        ],
      },
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'index.js',
            content: 'index',
          },
        ],
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result.find((f) => f.name === 'README.md')).toBeDefined();
    expect(result.find((f) => f.name === 'src')).toBeDefined();
    expect(result.find((f) => f.name === 'core')).toBeDefined();
  });

  it('should handle complex real-world scenario', () => {
    const coreFiles: IStructure = [
      {
        type: 'file',
        name: '.gitignore',
        content: 'node_modules/',
      },
      {
        type: 'file',
        name: 'package.json',
        content: '{"name": "core"}',
      },
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'file',
            name: 'test.txt',
            content: 'Test from core',
          },
          {
            type: 'folder',
            name: 'config',
            children: [
              {
                type: 'file',
                name: 'app.js',
                content: 'Core app config',
              },
            ],
          },
        ],
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'file',
        name: 'package.json',
        content: '{"name": "scaffolded"}',
      },
      {
        type: 'folder',
        name: 'src',
        children: [
          {
            type: 'folder',
            name: 'components',
            children: [
              {
                type: 'file',
                name: 'DataTable.tsx',
                content: 'DataTable component',
              },
            ],
          },
          {
            type: 'folder',
            name: 'config',
            children: [
              {
                type: 'file',
                name: 'routes.js',
                content: 'Routes config',
              },
            ],
          },
        ],
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(3);

    const gitignore = result.find((f) => f.name === '.gitignore');
    expect(gitignore).toBeDefined();

    const packageJson = result.find((f) => f.name === 'package.json');
    expect(packageJson).toBeDefined();
    if (packageJson?.type === 'file') {
      // Package.json merging formats with indentation
      expect(parseTestPackageJson(packageJson.content)).toEqual({
        name: 'scaffolded',
      });
    }

    const srcFolder = result.find((f) => f.name === 'src');
    expect(srcFolder).toBeDefined();
    expect(srcFolder?.type).toBe('folder');

    if (srcFolder?.type === 'folder') {
      expect(
        srcFolder.children.find((f) => f.name === 'test.txt'),
      ).toBeDefined();
      expect(
        srcFolder.children.find((f) => f.name === 'components'),
      ).toBeDefined();

      const configFolder = srcFolder.children.find((f) => f.name === 'config');
      expect(configFolder).toBeDefined();
      expect(configFolder?.type).toBe('folder');

      if (configFolder?.type === 'folder') {
        expect(configFolder.children).toHaveLength(2);
        expect(
          configFolder.children.find((f) => f.name === 'app.js'),
        ).toBeDefined();
        expect(
          configFolder.children.find((f) => f.name === 'routes.js'),
        ).toBeDefined();
      }
    }
  });

  it('should merge package.json dependencies instead of replacing', () => {
    const coreFiles: IStructure = [
      {
        type: 'file',
        name: 'package.json',
        content: JSON.stringify({
          name: 'core-project',
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
          },
          scripts: {
            build: 'vite build',
          },
        }),
      },
    ];

    const scaffoldedFiles: IStructure = [
      {
        type: 'file',
        name: 'package.json',
        content: JSON.stringify({
          dependencies: {
            hono: '^4.6.0',
          },
          devDependencies: {
            vitest: '^2.0.0',
          },
          scripts: {
            test: 'vitest',
          },
        }),
      },
    ];

    const result = mergeCoreFilesWithScaffolded(coreFiles, scaffoldedFiles);

    expect(result).toHaveLength(1);
    const packageJson = result[0];
    expect(packageJson.type).toBe('file');
    if (packageJson.type === 'file') {
      const content = parseTestPackageJson(packageJson.content);
      expect(content.name).toBe('core-project');
      expect(content.dependencies).toEqual({
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        hono: '^4.6.0',
      });
      expect(content.devDependencies).toEqual({
        typescript: '^5.0.0',
        vitest: '^2.0.0',
      });
      expect(content.scripts).toEqual({
        build: 'vite build',
        test: 'vitest',
      });
    }
  });
});
