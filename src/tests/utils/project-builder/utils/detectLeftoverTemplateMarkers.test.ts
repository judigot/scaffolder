import { describe, expect, it } from 'vitest';
import {
  detectLeftoverTemplateMarkers,
  findLeftoverTemplateMarkersInText,
} from '@/utils/project-builder/utils/detectLeftoverTemplateMarkers.ts';

describe('findLeftoverTemplateMarkersInText', () => {
  it('returns an empty list when no template markers remain', () => {
    expect(
      findLeftoverTemplateMarkersInText('const email = user.email;'),
    ).toEqual([]);
  });

  it('collects unresolved placeholders and IF tags', () => {
    const content = [
      'hashedPassword: <@@>userPasswordColumnCamelCase</@@>,',
      '<@@IF@@ condition="hasUsernameColumn EQUALS \'true\'">',
      'username: value,',
      '</@@IF@@>',
    ].join('\n');

    expect(findLeftoverTemplateMarkersInText(content)).toEqual([
      '<@@>userPasswordColumnCamelCase</@@>',
      '<@@IF@@ condition="hasUsernameColumn EQUALS \'true\'">',
      '</@@IF@@>',
    ]);
  });
});

describe('detectLeftoverTemplateMarkers', () => {
  it('rejects markers in file and directory names, including binary paths', () => {
    expect(
      detectLeftoverTemplateMarkers([
        { type: 'file', name: 'use<@@>methodName</@@>.ts', content: '' },
        {
          type: 'folder',
          name: '<@@>tableName</@@>',
          children: [],
        },
        {
          type: 'file',
          name: '<@@>asset</@@>.png',
          content: '',
          isBinary: true,
        },
      ]),
    ).toEqual([
      {
        filePath: 'use<@@>methodName</@@>.ts',
        markers: ['<@@>methodName</@@>'],
      },
      { filePath: '<@@>tableName</@@>', markers: ['<@@>tableName</@@>'] },
      { filePath: '<@@>asset</@@>.png', markers: ['<@@>asset</@@>'] },
    ]);
  });

  it('reports leftover markers with file paths and skips binaries', () => {
    const locations = detectLeftoverTemplateMarkers([
      {
        type: 'folder',
        name: 'api',
        children: [
          {
            type: 'file',
            name: 'auth.ts',
            content: 'col: <@@>userPasswordColumnCamelCase</@@>,',
          },
          {
            type: 'file',
            name: 'stars.jpg',
            content: '<@@>shouldNotScanBinary</@@>',
            isBinary: true,
          },
        ],
      },
    ]);

    expect(locations).toEqual([
      {
        filePath: 'api/auth.ts',
        markers: ['<@@>userPasswordColumnCamelCase</@@>'],
      },
    ]);
  });
});
