import { describe, it, expect } from 'vitest';
import { updateFilesInStructure } from '@/utils/project-builder/updateFilesInStructure.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

describe('updateFilesInStructure', () => {
  const createMockStructure = (): IStructure => [
    {
      type: 'file',
      name: 'root-file.txt',
      content: 'Original root content',
    },
    {
      type: 'folder',
      name: 'src',
      children: [
        {
          type: 'file',
          name: 'index.ts',
          content: 'Original index content',
        },
        {
          type: 'file',
          name: 'app.ts',
          content: 'Original app content',
        },
        {
          type: 'folder',
          name: 'components',
          children: [
            {
              type: 'file',
              name: 'Button.tsx',
              content: 'Original Button content',
            },
            {
              type: 'file',
              name: 'Input.tsx',
              content: 'Original Input content',
            },
          ],
        },
      ],
    },
    {
      type: 'folder',
      name: 'config',
      children: [
        {
          type: 'file',
          name: 'config.json',
          content: 'Original config content',
        },
      ],
    },
  ];

  it('should return original structure when updates map is empty', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>();

    const result = updateFilesInStructure(structure, updates);

    expect(result).toEqual(structure);
    expect(result).not.toBe(structure); // Should be a new object
  });

  it('should update a single root-level file', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['root-file.txt', 'Updated root content'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const rootFile = result.find((item) => item.name === 'root-file.txt');
    expect(rootFile).toBeDefined();
    expect(rootFile?.type).toBe('file');
    if (rootFile?.type === 'file') {
      expect(rootFile.content).toBe('Updated root content');
    }

    // Other files should remain unchanged
    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile?.type).toBe('file');
      if (indexFile?.type === 'file') {
        expect(indexFile.content).toBe('Original index content');
      }
    }
  });

  it('should update a single file in a nested folder', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/index.ts', 'Updated index content'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile?.type).toBe('file');
      if (indexFile?.type === 'file') {
        expect(indexFile.content).toBe('Updated index content');
      }

      // Other files in src should remain unchanged
      const appFile = srcFolder.children.find((item) => item.name === 'app.ts');
      expect(appFile?.type).toBe('file');
      if (appFile?.type === 'file') {
        expect(appFile.content).toBe('Original app content');
      }
    }
  });

  it('should update a file in deeply nested folder', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/components/Button.tsx', 'Updated Button content'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const componentsFolder = srcFolder.children.find(
        (item) => item.name === 'components',
      );
      expect(componentsFolder?.type).toBe('folder');
      if (componentsFolder?.type === 'folder') {
        const buttonFile = componentsFolder.children.find(
          (item) => item.name === 'Button.tsx',
        );
        expect(buttonFile?.type).toBe('file');
        if (buttonFile?.type === 'file') {
          expect(buttonFile.content).toBe('Updated Button content');
        }

        // Other files in components should remain unchanged
        const inputFile = componentsFolder.children.find(
          (item) => item.name === 'Input.tsx',
        );
        expect(inputFile?.type).toBe('file');
        if (inputFile?.type === 'file') {
          expect(inputFile.content).toBe('Original Input content');
        }
      }
    }
  });

  it('should update multiple files in different locations', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['root-file.txt', 'Updated root'],
      ['src/index.ts', 'Updated index'],
      ['src/components/Button.tsx', 'Updated Button'],
      ['config/config.json', 'Updated config'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    // Check root file
    const rootFile = result.find((item) => item.name === 'root-file.txt');
    expect(rootFile?.type).toBe('file');
    if (rootFile?.type === 'file') {
      expect(rootFile.content).toBe('Updated root');
    }

    // Check src/index.ts
    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile?.type).toBe('file');
      if (indexFile?.type === 'file') {
        expect(indexFile.content).toBe('Updated index');
      }

      // Check nested Button.tsx
      const componentsFolder = srcFolder.children.find(
        (item) => item.name === 'components',
      );
      expect(componentsFolder?.type).toBe('folder');
      if (componentsFolder?.type === 'folder') {
        const buttonFile = componentsFolder.children.find(
          (item) => item.name === 'Button.tsx',
        );
        expect(buttonFile?.type).toBe('file');
        if (buttonFile?.type === 'file') {
          expect(buttonFile.content).toBe('Updated Button');
        }
      }
    }

    // Check config file
    const configFolder = result.find((item) => item.name === 'config');
    expect(configFolder?.type).toBe('folder');
    if (configFolder?.type === 'folder') {
      const configFile = configFolder.children.find(
        (item) => item.name === 'config.json',
      );
      expect(configFile?.type).toBe('file');
      if (configFile?.type === 'file') {
        expect(configFile.content).toBe('Updated config');
      }
    }
  });

  it('should update multiple files in the same folder', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/index.ts', 'Updated index'],
      ['src/app.ts', 'Updated app'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile?.type).toBe('file');
      if (indexFile?.type === 'file') {
        expect(indexFile.content).toBe('Updated index');
      }

      const appFile = srcFolder.children.find((item) => item.name === 'app.ts');
      expect(appFile?.type).toBe('file');
      if (appFile?.type === 'file') {
        expect(appFile.content).toBe('Updated app');
      }
    }
  });

  it('should not modify files that are not in updates map', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/index.ts', 'Updated index'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    // Root file should be unchanged
    const rootFile = result.find((item) => item.name === 'root-file.txt');
    expect(rootFile?.type).toBe('file');
    if (rootFile?.type === 'file') {
      expect(rootFile.content).toBe('Original root content');
    }

    // Other files in src should be unchanged
    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const appFile = srcFolder.children.find((item) => item.name === 'app.ts');
      expect(appFile?.type).toBe('file');
      if (appFile?.type === 'file') {
        expect(appFile.content).toBe('Original app content');
      }
    }
  });

  it('should handle non-existent file paths gracefully', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['non-existent/file.txt', 'This should not appear'],
      ['src/index.ts', 'Updated index'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    // Valid file should be updated
    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile?.type).toBe('file');
      if (indexFile?.type === 'file') {
        expect(indexFile.content).toBe('Updated index');
      }
    }

    // Structure should remain valid (no new files created)
    expect(result.length).toBe(structure.length);
  });

  it('should preserve folder structure when updating files', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/components/Button.tsx', 'Updated Button'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    // Verify folder structure is preserved
    const srcFolder = result.find((item) => item.name === 'src');
    expect(srcFolder?.type).toBe('folder');
    if (srcFolder?.type === 'folder') {
      expect(srcFolder.children.length).toBe(3); // index.ts, app.ts, components folder

      const componentsFolder = srcFolder.children.find(
        (item) => item.name === 'components',
      );
      expect(componentsFolder?.type).toBe('folder');
      if (componentsFolder?.type === 'folder') {
        expect(componentsFolder.children.length).toBe(2); // Button.tsx, Input.tsx
      }
    }
  });

  it('should handle empty structure', () => {
    const structure: IStructure = [];
    const updates = new Map<string, string>([['some-file.txt', 'Content']]);

    const result = updateFilesInStructure(structure, updates);

    expect(result).toEqual([]);
  });

  it('should handle structure with only files (no folders)', () => {
    const structure: IStructure = [
      {
        type: 'file',
        name: 'file1.txt',
        content: 'Original content 1',
      },
      {
        type: 'file',
        name: 'file2.txt',
        content: 'Original content 2',
      },
    ];

    const updates = new Map<string, string>([
      ['file1.txt', 'Updated content 1'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    expect(result.length).toBe(2);
    const file1 = result.find((item) => item.name === 'file1.txt');
    expect(file1?.type).toBe('file');
    if (file1?.type === 'file') {
      expect(file1.content).toBe('Updated content 1');
    }

    const file2 = result.find((item) => item.name === 'file2.txt');
    expect(file2?.type).toBe('file');
    if (file2?.type === 'file') {
      expect(file2.content).toBe('Original content 2');
    }
  });

  it('should handle structure with only folders (no root files)', () => {
    const structure: IStructure = [
      {
        type: 'folder',
        name: 'folder1',
        children: [
          {
            type: 'file',
            name: 'file1.txt',
            content: 'Original content',
          },
        ],
      },
    ];

    const updates = new Map<string, string>([
      ['folder1/file1.txt', 'Updated content'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    expect(result.length).toBe(1);
    const folder1 = result[0];
    expect(folder1.type).toBe('folder');
    if (folder1.type === 'folder') {
      const file1 = folder1.children[0];
      expect(file1.type).toBe('file');
      if (file1.type === 'file') {
        expect(file1.content).toBe('Updated content');
      }
    }
  });

  it('should create new structure objects (immutability)', () => {
    const structure = createMockStructure();
    const updates = new Map<string, string>([
      ['src/index.ts', 'Updated index'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    // Result should be a new array
    expect(result).not.toBe(structure);

    // Updated folder should be a new object
    const srcFolder = result.find((item) => item.name === 'src');
    const originalSrcFolder = structure.find((item) => item.name === 'src');
    expect(srcFolder).not.toBe(originalSrcFolder);

    // Updated file should be a new object
    if (srcFolder?.type === 'folder' && originalSrcFolder?.type === 'folder') {
      const indexFile = srcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      const originalIndexFile = originalSrcFolder.children.find(
        (item) => item.name === 'index.ts',
      );
      expect(indexFile).not.toBe(originalIndexFile);
    }

    // Unchanged folders should also be new objects (for immutability)
    const configFolder = result.find((item) => item.name === 'config');
    const originalConfigFolder = structure.find(
      (item) => item.name === 'config',
    );
    expect(configFolder).not.toBe(originalConfigFolder);
  });

  it('should handle very long file paths', () => {
    const structure: IStructure = [
      {
        type: 'folder',
        name: 'a',
        children: [
          {
            type: 'folder',
            name: 'b',
            children: [
              {
                type: 'folder',
                name: 'c',
                children: [
                  {
                    type: 'folder',
                    name: 'd',
                    children: [
                      {
                        type: 'file',
                        name: 'deep-file.txt',
                        content: 'Original deep content',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const updates = new Map<string, string>([
      ['a/b/c/d/deep-file.txt', 'Updated deep content'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const aFolder = result[0];
    expect(aFolder.type).toBe('folder');
    if (aFolder.type === 'folder') {
      const bFolder = aFolder.children[0];
      expect(bFolder.type).toBe('folder');
      if (bFolder.type === 'folder') {
        const cFolder = bFolder.children[0];
        expect(cFolder.type).toBe('folder');
        if (cFolder.type === 'folder') {
          const dFolder = cFolder.children[0];
          expect(dFolder.type).toBe('folder');
          if (dFolder.type === 'folder') {
            const deepFile = dFolder.children[0];
            expect(deepFile.type).toBe('file');
            if (deepFile.type === 'file') {
              expect(deepFile.content).toBe('Updated deep content');
            }
          }
        }
      }
    }
  });

  it('should handle special characters in file names', () => {
    const structure: IStructure = [
      {
        type: 'file',
        name: 'file-with-dashes.txt',
        content: 'Original content',
      },
      {
        type: 'file',
        name: 'file_with_underscores.txt',
        content: 'Original content',
      },
      {
        type: 'file',
        name: 'file.with.dots.txt',
        content: 'Original content',
      },
    ];

    const updates = new Map<string, string>([
      ['file-with-dashes.txt', 'Updated dashes'],
      ['file_with_underscores.txt', 'Updated underscores'],
      ['file.with.dots.txt', 'Updated dots'],
    ]);

    const result = updateFilesInStructure(structure, updates);

    const dashesFile = result.find(
      (item) => item.name === 'file-with-dashes.txt',
    );
    expect(dashesFile?.type).toBe('file');
    if (dashesFile?.type === 'file') {
      expect(dashesFile.content).toBe('Updated dashes');
    }

    const underscoresFile = result.find(
      (item) => item.name === 'file_with_underscores.txt',
    );
    expect(underscoresFile?.type).toBe('file');
    if (underscoresFile?.type === 'file') {
      expect(underscoresFile.content).toBe('Updated underscores');
    }

    const dotsFile = result.find((item) => item.name === 'file.with.dots.txt');
    expect(dotsFile?.type).toBe('file');
    if (dotsFile?.type === 'file') {
      expect(dotsFile.content).toBe('Updated dots');
    }
  });
});
