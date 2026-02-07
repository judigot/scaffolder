import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __clearLegacyDslWarningsForTests,
  emitLegacyDslWarnings,
} from '@/utils/project-builder/template-processors/dslCompatibility.ts';

describe('dslCompatibility warnings', () => {
  beforeEach(() => {
    __clearLegacyDslWarningsForTests();
  });

  afterEach(() => {
    __clearLegacyDslWarningsForTests();
    vi.restoreAllMocks();
  });

  it('warns once per legacy syntax', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    emitLegacyDslWarnings(
      '[[LOOP(tables)]] {{tableName}} [[USE_DATA(name)]]',
      'a.txt',
    );
    emitLegacyDslWarnings(
      '[[LOOP(tables)]] {{tableName}} [[USE_DATA(name)]]',
      'a.txt',
    );

    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it('deduplicates same syntax across files', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    emitLegacyDslWarnings('{{tableName}}', 'a.txt');
    emitLegacyDslWarnings('{{tableName}}', 'b.txt');

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
