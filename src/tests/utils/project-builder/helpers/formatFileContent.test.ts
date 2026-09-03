import { describe, expect, it, vi } from 'vitest';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import * as autoFormat from '@/utils/project-builder/helpers/autoFormatByExtension.ts';

describe('formatFileContent leftover markers', () => {
  it('skips prettier when leftover template markers remain', async () => {
    const autoFormatSpy = vi.spyOn(autoFormat, 'autoFormatByExtension');

    const result = await formatFileContent(
      'const value = { <@@>userPasswordColumnCamelCase</@@>: 1, };',
      'auth.ts',
      true,
    );

    expect(autoFormatSpy).not.toHaveBeenCalled();
    expect(result.failed).toBe(false);
    expect(result.leftoverTemplateMarkers).toEqual([
      '<@@>userPasswordColumnCamelCase</@@>',
    ]);
    expect(result.content).toContain('<@@>userPasswordColumnCamelCase</@@>');
  });
});

describe('autoFormatByExtension prisma', () => {
  it('formats prisma schema with the prisma-parse parser', async () => {
    const result = await autoFormat.autoFormatByExtension(
      'datasource db { provider = "postgresql" url = env("DATABASE_URL") }\nmodel User { id Int @id }',
      'schema.prisma',
    );
    expect(result.failed).toBe(false);
    expect(result.content).toContain('model User');
  });
});
