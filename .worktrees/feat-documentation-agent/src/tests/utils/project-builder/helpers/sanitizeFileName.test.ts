import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '@/utils/project-builder/helpers/sanitizeFileName.ts';

describe('sanitizeFileName', () => {
  describe('Invalid characters', () => {
    it('should replace colons with hyphens', () => {
      expect(sanitizeFileName('2026-01-01T17:45:31.646Z_product.sql')).toBe(
        '2026-01-01T17-45-31.646Z_product.sql',
      );
    });

    it('should remove other invalid characters', () => {
      expect(sanitizeFileName('file<name>with"invalid|chars?.txt')).toBe(
        'filenamewithinvalidchars.txt',
      );
    });

    it('should remove forward and backslashes', () => {
      expect(sanitizeFileName('path/to/file\\name.txt')).toBe(
        'pathtofilename.txt',
      );
    });
  });

  describe('Control characters', () => {
    it('should remove null bytes', () => {
      expect(sanitizeFileName('file\x00name.txt')).toBe('filename.txt');
    });

    it('should remove other control characters', () => {
      expect(sanitizeFileName('file\x01\x02\x03name.txt')).toBe('filename.txt');
    });

    it('should remove extended control characters', () => {
      expect(sanitizeFileName('file\x80\x9Fname.txt')).toBe('filename.txt');
    });
  });

  describe('Reserved Windows filenames', () => {
    it('should handle CON reserved name', () => {
      expect(sanitizeFileName('CON.txt')).toBe('_CON.txt');
    });

    it('should handle PRN reserved name', () => {
      expect(sanitizeFileName('PRN')).toBe('_PRN');
    });

    it('should handle AUX reserved name', () => {
      expect(sanitizeFileName('AUX.log')).toBe('_AUX.log');
    });

    it('should handle NUL reserved name', () => {
      expect(sanitizeFileName('NUL')).toBe('_NUL');
    });

    it('should handle COM1-COM9 reserved names', () => {
      expect(sanitizeFileName('COM1.txt')).toBe('_COM1.txt');
      expect(sanitizeFileName('COM9.log')).toBe('_COM9.log');
    });

    it('should handle LPT1-LPT9 reserved names', () => {
      expect(sanitizeFileName('LPT1.txt')).toBe('_LPT1.txt');
      expect(sanitizeFileName('LPT9.log')).toBe('_LPT9.log');
    });

    it('should handle reserved names case-insensitively', () => {
      expect(sanitizeFileName('con.txt')).toBe('_con.txt');
      expect(sanitizeFileName('PrN.log')).toBe('_PrN.log');
      expect(sanitizeFileName('aux')).toBe('_aux');
    });
  });

  describe('Trailing and leading characters', () => {
    it('should remove trailing periods', () => {
      expect(sanitizeFileName('filename...')).toBe('filename');
    });

    it('should remove trailing spaces', () => {
      expect(sanitizeFileName('filename   ')).toBe('filename');
    });

    it('should remove leading periods', () => {
      expect(sanitizeFileName('...filename.txt')).toBe('filename.txt');
    });

    it('should remove leading spaces', () => {
      expect(sanitizeFileName('   filename.txt')).toBe('filename.txt');
    });

    it('should remove trailing periods and spaces', () => {
      expect(sanitizeFileName('filename. . . ')).toBe('filename');
    });
  });

  describe('Length restrictions', () => {
    it('should truncate filenames longer than 255 characters', () => {
      const longName = `${'a'.repeat(300)}.txt`;
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toMatch(/\.txt$/);
    });

    it('should preserve extension when truncating', () => {
      const longName = `${'a'.repeat(300)}.verylongextension`;
      const result = sanitizeFileName(longName);
      expect(result).toMatch(/\.verylongextension$/);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle filenames without extensions', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('file');
    });

    it('should handle string with only invalid characters', () => {
      // Colon becomes hyphen, others are removed, leaving just hyphen which gets removed
      expect(sanitizeFileName('<>:"|?*\\/')).toBe('file');
    });

    it('should handle string with only spaces', () => {
      expect(sanitizeFileName('   ')).toBe('file');
    });

    it('should handle string with only periods', () => {
      expect(sanitizeFileName('...')).toBe('file');
    });

    it('should handle multiple consecutive dots', () => {
      expect(sanitizeFileName('file....name.txt')).toBe('file.name.txt');
    });

    it('should handle null/undefined by returning default', () => {
      // @ts-expect-error - Testing invalid input
      expect(sanitizeFileName(null)).toBe('file');
      // @ts-expect-error - Testing invalid input
      expect(sanitizeFileName(undefined)).toBe('file');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle ISO 8601 timestamps', () => {
      expect(sanitizeFileName('2026-01-01T17:45:31.646Z_product.sql')).toBe(
        '2026-01-01T17-45-31.646Z_product.sql',
      );
    });

    it('should handle complex filenames with multiple issues', () => {
      expect(sanitizeFileName('  file<name>with:invalid|chars?.txt  ')).toBe(
        'filenamewith-invalidchars.txt',
      );
    });

    it('should preserve valid filenames', () => {
      expect(sanitizeFileName('valid-filename_123.txt')).toBe(
        'valid-filename_123.txt',
      );
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFileName('file-ñame-测试.txt')).toBe('file-ñame-测试.txt');
    });
  });
});
