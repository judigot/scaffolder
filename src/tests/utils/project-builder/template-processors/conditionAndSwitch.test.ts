import { describe, expect, it } from 'vitest';
import {
  evaluateCondition,
  processHtmlSwitch,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';

describe('evaluateCondition enhancements', () => {
  it('supports IN operator', () => {
    expect(
      evaluateCondition("data_type IN 'string,number,boolean'", {
        data_type: 'number',
      }),
    ).toBe(true);
  });

  it('supports numeric comparison operators', () => {
    expect(
      evaluateCondition('max_length >= 10', {
        max_length: '12',
      }),
    ).toBe(true);

    expect(
      evaluateCondition('max_length < 10', {
        max_length: '12',
      }),
    ).toBe(false);
  });
});

describe('processHtmlSwitch', () => {
  it('selects matching CASE branch', () => {
    const template = `<@@SWITCH@@ on="data_type"><@@CASE@@ value="number">bigint</@@CASE@@><@@CASE@@ value="string">text</@@CASE@@><@@DEFAULT@@>jsonb</@@DEFAULT@@></@@SWITCH@@>`;
    const result = processHtmlSwitch(template, { data_type: 'string' });
    expect(result).toBe('text');
  });

  it('falls back to DEFAULT branch', () => {
    const template = `<@@SWITCH@@ on="data_type"><@@CASE@@ value="number">bigint</@@CASE@@><@@DEFAULT@@>jsonb</@@DEFAULT@@></@@SWITCH@@>`;
    const result = processHtmlSwitch(template, { data_type: 'uuid' });
    expect(result).toBe('jsonb');
  });
});
