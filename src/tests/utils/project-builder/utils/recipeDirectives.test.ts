import { describe, expect, it } from 'vitest';
import { replaceCoversApi } from '@/utils/project-builder/utils/recipeDirectives.ts';

describe('replaceCoversApi', () => {
  it('treats apps/api/** as a complete API subtree replace', () => {
    expect(replaceCoversApi(['apps/api/**'])).toBe(true);
    expect(replaceCoversApi(['apps/api'])).toBe(true);
    expect(replaceCoversApi(['apps/**'])).toBe(true);
  });

  it('does not treat a package.json-only glob as covering the API', () => {
    expect(replaceCoversApi(['apps/api/package.json'])).toBe(false);
  });
});
