import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '@/utils/project-builder/template-processors/processIterateCommand.ts';

describe('evaluateCondition', () => {
  const replacements = {
    column_name: 'created_at',
    data_type: 'timestamp',
    is_primary_key: 'false',
    is_nullable: 'YES',
    value: 'user_id',
  };

  describe('EQUALS operator', () => {
    it('should return true when values match', () => {
      expect(evaluateCondition("is_primary_key EQUALS 'false'", replacements)).toBe(true);
    });

    it('should return false when values do not match', () => {
      expect(evaluateCondition("is_primary_key EQUALS 'true'", replacements)).toBe(false);
    });
  });

  describe('NOT EQUAL operator', () => {
    it('should return true when values differ', () => {
      expect(evaluateCondition("is_primary_key NOT EQUAL 'true'", replacements)).toBe(true);
    });

    it('should return false when values match', () => {
      expect(evaluateCondition("is_primary_key NOT EQUAL 'false'", replacements)).toBe(false);
    });
  });

  describe('CONTAINS operator', () => {
    it('should return true when value contains substring', () => {
      expect(evaluateCondition("data_type CONTAINS 'time'", replacements)).toBe(true);
    });

    it('should return false when value does not contain substring', () => {
      expect(evaluateCondition("data_type CONTAINS 'int'", replacements)).toBe(false);
    });
  });

  describe('STARTS_WITH operator', () => {
    it('should return true when value starts with prefix', () => {
      expect(evaluateCondition("column_name STARTS_WITH 'created'", replacements)).toBe(true);
    });

    it('should return false when value does not start with prefix', () => {
      expect(evaluateCondition("column_name STARTS_WITH 'updated'", replacements)).toBe(false);
    });
  });

  describe('ENDS_WITH operator', () => {
    it('should return true when value ends with suffix', () => {
      expect(evaluateCondition("column_name ENDS_WITH '_at'", replacements)).toBe(true);
    });

    it('should return false when value does not end with suffix', () => {
      expect(evaluateCondition("column_name ENDS_WITH '_id'", replacements)).toBe(false);
    });

    it('should match _id suffix correctly', () => {
      expect(evaluateCondition("value ENDS_WITH '_id'", replacements)).toBe(true);
    });
  });

  describe('NOT prefix', () => {
    it('should negate EQUALS', () => {
      expect(evaluateCondition("NOT is_primary_key EQUALS 'true'", replacements)).toBe(true);
    });

    it('should negate ENDS_WITH', () => {
      expect(evaluateCondition("NOT column_name ENDS_WITH '_id'", replacements)).toBe(true);
    });

    it('should negate CONTAINS', () => {
      expect(evaluateCondition("NOT data_type CONTAINS 'int'", replacements)).toBe(true);
    });
  });

  describe('compound AND conditions', () => {
    it('should return true when all conditions match', () => {
      expect(
        evaluateCondition(
          "is_primary_key EQUALS 'false' AND column_name ENDS_WITH '_at'",
          replacements,
        ),
      ).toBe(true);
    });

    it('should return false when any condition fails', () => {
      expect(
        evaluateCondition(
          "is_primary_key EQUALS 'true' AND column_name ENDS_WITH '_at'",
          replacements,
        ),
      ).toBe(false);
    });

    it('should support multiple AND conditions', () => {
      expect(
        evaluateCondition(
          "is_primary_key EQUALS 'false' AND is_nullable EQUALS 'YES' AND data_type CONTAINS 'time'",
          replacements,
        ),
      ).toBe(true);
    });
  });

  describe('compound OR conditions', () => {
    it('should return true when any condition matches', () => {
      expect(
        evaluateCondition(
          "is_primary_key EQUALS 'true' OR column_name ENDS_WITH '_at'",
          replacements,
        ),
      ).toBe(true);
    });

    it('should return false when no conditions match', () => {
      expect(
        evaluateCondition(
          "is_primary_key EQUALS 'true' OR column_name ENDS_WITH '_id'",
          replacements,
        ),
      ).toBe(false);
    });
  });

  describe('filter use case: payload generation', () => {
    const columns = [
      { value: 'id', is_primary_key: 'true', data_type: 'bigint' },
      { value: 'name', is_primary_key: 'false', data_type: 'text' },
      { value: 'created_at', is_primary_key: 'false', data_type: 'timestamp' },
      { value: 'user_id', is_primary_key: 'false', data_type: 'bigint' },
    ];

    it('should filter out primary keys and timestamps', () => {
      const filterCondition =
        "is_primary_key NOT EQUAL 'true' AND NOT value ENDS_WITH '_at'";

      const filtered = columns.filter((col) => {
        const colReplacements: Record<string, string> = {
          value: col.value,
          is_primary_key: col.is_primary_key,
          data_type: col.data_type,
        };
        return evaluateCondition(filterCondition, colReplacements);
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.value)).toEqual(['name', 'user_id']);
    });
  });
});
