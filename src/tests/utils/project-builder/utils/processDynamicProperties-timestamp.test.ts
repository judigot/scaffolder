import { describe, it, expect } from 'vitest';
import { processDynamicProperties } from '@/utils/project-builder/utils/processDynamicProperties.ts';
import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

describe('processDynamicProperties - timestamp offset functionality', () => {
  it('should generate unique timestamps for different table indices', () => {
    const template = '{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements1: Replacements = {
      tableIndex: '0',
      totalTables: '3',
    };
    const replacements2: Replacements = {
      tableIndex: '1',
      totalTables: '3',
    };
    const replacements3: Replacements = {
      tableIndex: '2',
      totalTables: '3',
    };

    const result1 = processDynamicProperties(template, replacements1);
    const result2 = processDynamicProperties(template, replacements2);
    const result3 = processDynamicProperties(template, replacements3);

    const timestamps = [result1, result2, result3];
    const uniqueTimestamps = new Set(timestamps);

    expect(uniqueTimestamps.size).toBe(3);
  });

  it('should preserve order when generating timestamps', () => {
    const template = '{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements: Replacements[] = [
      { tableIndex: '0', totalTables: '5' },
      { tableIndex: '1', totalTables: '5' },
      { tableIndex: '2', totalTables: '5' },
      { tableIndex: '3', totalTables: '5' },
      { tableIndex: '4', totalTables: '5' },
    ];

    const timestamps = replacements.map((repl) =>
      processDynamicProperties(template, repl),
    );

    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i] < timestamps[i + 1]).toBe(true);
    }
  });

  it('should handle tableIndex as string and apply correct offset', () => {
    const template = '{{timestamp("YYYY-MM-DD HH:mm:ss")}}';

    const replacements0: Replacements = {
      tableIndex: '0',
      totalTables: '10',
    };
    const replacements5: Replacements = {
      tableIndex: '5',
      totalTables: '10',
    };

    const result0 = processDynamicProperties(template, replacements0);
    const result5 = processDynamicProperties(template, replacements5);

    expect(result0).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result5).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const date0 = new Date(result0);
    const date5 = new Date(result5);

    const timeDiff = date5.getTime() - date0.getTime();
    expect(timeDiff).toBe(5000);
  });

  it('should handle missing tableIndex (defaults to 0)', () => {
    const template = '{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements: Replacements = {
      totalTables: '3',
    };

    const result = processDynamicProperties(template, replacements);
    expect(result).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}$/);
  });

  it('should handle invalid tableIndex (defaults to 0)', () => {
    const template = '{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements: Replacements = {
      tableIndex: 'invalid',
      totalTables: '3',
    };

    const result = processDynamicProperties(template, replacements);
    expect(result).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}$/);
  });

  it('should work with ISO format (default)', () => {
    const template = '{{timestamp}}';

    const replacements1: Replacements = {
      tableIndex: '0',
      totalTables: '2',
    };
    const replacements2: Replacements = {
      tableIndex: '1',
      totalTables: '2',
    };

    const result1 = processDynamicProperties(template, replacements1);
    const result2 = processDynamicProperties(template, replacements2);

    const date1 = new Date(result1);
    const date2 = new Date(result2);

    const diff = date2.getTime() - date1.getTime();
    expect(diff).toBeGreaterThanOrEqual(1000);
    expect(diff).toBeLessThanOrEqual(1050);
  });

  it('should work with Laravel format', () => {
    const template = '{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements1: Replacements = {
      tableIndex: '0',
      totalTables: '2',
    };
    const replacements2: Replacements = {
      tableIndex: '1',
      totalTables: '2',
    };

    const result1 = processDynamicProperties(template, replacements1);
    const result2 = processDynamicProperties(template, replacements2);

    expect(result1).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}$/);
    expect(result2).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}$/);
    expect(result1).not.toBe(result2);
  });

  it('should work with Rails format', () => {
    const template = '{{timestamp("YYYYMMDDHHmmss")}}';

    const replacements1: Replacements = {
      tableIndex: '0',
      totalTables: '2',
    };
    const replacements2: Replacements = {
      tableIndex: '1',
      totalTables: '2',
    };

    const result1 = processDynamicProperties(template, replacements1);
    const result2 = processDynamicProperties(template, replacements2);

    expect(result1).toMatch(/^\d{14}$/);
    expect(result2).toMatch(/^\d{14}$/);
    expect(result1).not.toBe(result2);
  });

  it('should generate timestamps with 1 second increments', () => {
    const template = '{{timestamp("YYYY-MM-DD HH:mm:ss")}}';

    const replacements: Replacements[] = [
      { tableIndex: '0', totalTables: '3' },
      { tableIndex: '1', totalTables: '3' },
      { tableIndex: '2', totalTables: '3' },
    ];

    const timestamps = replacements.map((repl) =>
      processDynamicProperties(template, repl),
    );
    const dates = timestamps.map((ts) => new Date(ts));

    for (let i = 0; i < dates.length - 1; i++) {
      const timeDiff = dates[i + 1].getTime() - dates[i].getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(1000);
      expect(timeDiff).toBeLessThanOrEqual(1050);
    }
  });

  it('should handle multiple timestamp placeholders in same template', () => {
    const template =
      '{{timestamp("YYYY_MM_DD_HHmmss")}}-{{timestamp("YYYY_MM_DD_HHmmss")}}';

    const replacements: Replacements = {
      tableIndex: '1',
      totalTables: '3',
    };

    const result = processDynamicProperties(template, replacements);
    const parts = result.split('-');

    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(parts[1]);
  });
});
