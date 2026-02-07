import { describe, expect, it } from 'vitest';
import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';
import { importTemplateAsPlaceholder } from '@/utils/project-builder/template-processors/importTemplateAsPlaceholder.ts';
import { processDynamicProperties } from '@/utils/project-builder/utils/processDynamicProperties.ts';
import { resolvePlaceholderValue } from '@/utils/project-builder/utils/placeholderTransforms.ts';

describe('placeholderTransforms', () => {
  const replacements: Replacements = {
    tableName: 'user_profile',
    'column.name': 'created_at',
  };

  it('resolves direct transform from base key', () => {
    const resolved = resolvePlaceholderValue(
      'tableName.pascalCase',
      replacements,
    );
    expect(resolved?.value).toBe('UserProfile');
    expect(resolved?.sourceKey).toBe('tableName');
  });

  it('resolves chained transforms left-to-right', () => {
    const resolved = resolvePlaceholderValue(
      'tableName.plural.pascalCase',
      replacements,
    );
    expect(resolved?.value).toBe('UserProfiles');
  });

  it('supports transforms on namespaced keys', () => {
    const resolved = resolvePlaceholderValue(
      'column.name.camelCase',
      replacements,
    );
    expect(resolved?.value).toBe('createdAt');
    expect(resolved?.sourceKey).toBe('column.name');
  });

  it('keeps base value for unknown transform', () => {
    const resolved = resolvePlaceholderValue(
      'tableName.unknownCase',
      replacements,
    );
    expect(resolved?.value).toBe('user_profile');
  });

  it('processes transformed placeholders in dynamic property pass', () => {
    const result = processDynamicProperties(
      '{{tableName.camelCase}}',
      replacements,
    );
    expect(result).toBe('userProfile');
  });

  it('processes transformed placeholders in placeholder import pass', () => {
    const result = importTemplateAsPlaceholder(
      '{{tableName.plural.kebabCase}}',
      replacements,
    );
    expect(result).toBe('user-profiles');
  });
});
