import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatIndex,
  parseFunctionCall,
  processIndexFunction,
  processTimestampFunction,
} from '@/utils/project-builder/utils/placeholderFunctions.ts';

describe('placeholderFunctions', () => {
  describe('formatTimestamp', () => {
    it('should return ISO 8601 format when no format is provided', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = formatTimestamp(undefined, date);
      expect(result).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should format date with custom format string', () => {
      const date = new Date('2024-01-15T12:30:45.000Z');
      expect(formatTimestamp('YYYY-MM-DD', date)).toBe('2024-01-15');
      expect(formatTimestamp('YYYY_MM_DD_HHmmss', date)).toBe(
        '2024_01_15_123045',
      );
      expect(formatTimestamp('YYYYMMDDHHmmss', date)).toBe('20240115123045');
    });

    it('should handle all format tokens', () => {
      const date = new Date('2024-01-15T12:30:45.123Z');
      expect(formatTimestamp('YYYY', date)).toBe('2024');
      expect(formatTimestamp('YY', date)).toBe('24');
      expect(formatTimestamp('MM', date)).toBe('01');
      expect(formatTimestamp('DD', date)).toBe('15');
      expect(formatTimestamp('HH', date)).toBe('12');
      expect(formatTimestamp('mm', date)).toBe('30');
      expect(formatTimestamp('ss', date)).toBe('45');
    });

    it('should sanitize format string to prevent injection', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      // Attempted injection - dangerous characters (semicolons, quotes) should be removed
      // Note: SQL keywords and comments are not removed since format strings are parsed by JavaScript, not SQL
      const maliciousFormat = "YYYY-MM-DD'; DROP TABLE users; --";
      const result = formatTimestamp(maliciousFormat, date);
      // Dangerous characters that could break string replacement should be removed
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
      // Format should still work correctly
      expect(result).toContain('2024-01-15');
    });

    it('should handle Unix timestamp formats', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const unixSeconds = Math.floor(date.getTime() / 1000);
      const unixMilliseconds = date.getTime();

      expect(formatTimestamp('X', date)).toBe(String(unixSeconds));
      expect(formatTimestamp('x', date)).toBe(String(unixMilliseconds));
    });
  });

  describe('formatIndex', () => {
    it('should return 0-based index by default', () => {
      expect(formatIndex(0, undefined, 0, undefined, 0)).toBe('0');
      expect(formatIndex(0, undefined, 0, undefined, 1)).toBe('1');
      expect(formatIndex(0, undefined, 0, undefined, 2)).toBe('2');
    });

    it('should return 1-based index when base is 1', () => {
      expect(formatIndex(1, undefined, 0, undefined, 0)).toBe('1');
      expect(formatIndex(1, undefined, 0, undefined, 1)).toBe('2');
      expect(formatIndex(1, undefined, 0, undefined, 2)).toBe('3');
    });

    it('should zero-pad when width is specified', () => {
      expect(formatIndex(1, 3, 0, undefined, 0)).toBe('001');
      expect(formatIndex(1, 3, 0, undefined, 1)).toBe('002');
      expect(formatIndex(1, 3, 0, undefined, 9)).toBe('010');
    });

    it('should auto-calculate width from total count', () => {
      expect(formatIndex(1, 'auto', 0, 10, 0)).toBe('01');
      expect(formatIndex(1, 'auto', 0, 10, 9)).toBe('10');
      expect(formatIndex(1, 'auto', 0, 100, 0)).toBe('001');
      expect(formatIndex(1, 'auto', 0, 100, 99)).toBe('100');
    });

    it('should apply offset correctly', () => {
      expect(formatIndex(1, 3, 100, undefined, 0)).toBe('101');
      expect(formatIndex(1, 3, 100, undefined, 1)).toBe('102');
      expect(formatIndex(0, 3, 10, undefined, 0)).toBe('010');
    });

    it('should return empty string when currentIndex is undefined', () => {
      expect(formatIndex(0, undefined, 0, undefined, undefined)).toBe('');
    });
  });

  describe('parseFunctionCall', () => {
    it('should parse function call with no arguments', () => {
      const result = parseFunctionCall('index()');
      expect(result.functionName).toBe('index');
      expect(result.args).toEqual([]);
    });

    it('should parse function call with single argument', () => {
      const result = parseFunctionCall('index(1)');
      expect(result.functionName).toBe('index');
      expect(result.args).toEqual(['1']);
    });

    it('should parse function call with multiple arguments', () => {
      const result = parseFunctionCall('index(1, 3, 100)');
      expect(result.functionName).toBe('index');
      expect(result.args).toEqual(['1', '3', '100']);
    });

    it('should parse function call with quoted string arguments', () => {
      const result = parseFunctionCall("timestamp('YYYY-MM-DD')");
      expect(result.functionName).toBe('timestamp');
      expect(result.args).toEqual(["'YYYY-MM-DD'"]);
    });

    it('should parse property access (non-function)', () => {
      const result = parseFunctionCall('index');
      expect(result.functionName).toBe('index');
      expect(result.args).toEqual([]);
    });

    it('should handle complex arguments with quotes', () => {
      const result = parseFunctionCall("timestamp('YYYY_MM_DD_HHmmss')");
      expect(result.functionName).toBe('timestamp');
      expect(result.args.length).toBe(1);
      expect(result.args[0]).toContain('YYYY_MM_DD_HHmmss');
    });
  });

  describe('processIndexFunction', () => {
    it('should process index() with no arguments (0-based)', () => {
      expect(processIndexFunction([], 0, 10)).toBe('0');
      expect(processIndexFunction([], 1, 10)).toBe('1');
    });

    it('should process index(1) (1-based)', () => {
      expect(processIndexFunction(['1'], 0, 10)).toBe('1');
      expect(processIndexFunction(['1'], 1, 10)).toBe('2');
    });

    it('should process index(1, 3) (1-based, 3-digit padding)', () => {
      expect(processIndexFunction(['1', '3'], 0, 10)).toBe('001');
      expect(processIndexFunction(['1', '3'], 1, 10)).toBe('002');
    });

    it('should process index(1, 3, 100) (with offset)', () => {
      expect(processIndexFunction(['1', '3', '100'], 0, 10)).toBe('101');
      expect(processIndexFunction(['1', '3', '100'], 1, 10)).toBe('102');
    });

    it('should detect format string from first argument', () => {
      expect(processIndexFunction(["'001'"], 0, 10)).toBe('001');
      expect(processIndexFunction(['"001"'], 0, 10)).toBe('001');
      expect(processIndexFunction(['0001'], 0, 10)).toBe('0001');
    });

    it('should handle auto width', () => {
      expect(processIndexFunction(['1', 'auto'], 0, 10)).toBe('01');
      expect(processIndexFunction(['1', 'auto'], 0, 100)).toBe('001');
    });
  });

  describe('processTimestampFunction', () => {
    it('should return ISO format when no arguments', () => {
      const result = processTimestampFunction([]);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should process timestamp with format string', () => {
      const result = processTimestampFunction(["'YYYY-MM-DD'"]);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle Laravel format', () => {
      const result = processTimestampFunction(["'YYYY_MM_DD_HHmmss'"]);
      expect(result).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}$/);
    });

    it('should handle Rails format', () => {
      const result = processTimestampFunction(["'YYYYMMDDHHmmss'"]);
      expect(result).toMatch(/^\d{14}$/);
    });

    it('should remove quotes from format string', () => {
      const result1 = processTimestampFunction(["'YYYY-MM-DD'"]);
      const result2 = processTimestampFunction(['"YYYY-MM-DD"']);
      expect(result1).toBe(result2);
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
