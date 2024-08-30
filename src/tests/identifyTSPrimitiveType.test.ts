import { describe, it, expect } from 'vitest';
import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType';

describe('identifyTSPrimitiveType', () => {
  it('should return "number" for integers', () => {
    expect(identifyTSPrimitiveType(42)).toBe('number');
    expect(identifyTSPrimitiveType(-42)).toBe('number');
  });

  it('should return "float" for floating-point numbers', () => {
    expect(identifyTSPrimitiveType(42.5)).toBe('float');
    expect(identifyTSPrimitiveType(-42.5)).toBe('float');
  });

  it('should return "Date" for Date objects', () => {
    expect(identifyTSPrimitiveType(new Date())).toBe('Date');
  });

  it('should return "Date" for valid date strings', () => {
    expect(identifyTSPrimitiveType('2023-08-30T12:00:00Z')).toBe('Date');
    expect(identifyTSPrimitiveType('2023-08-30')).toBe('Date');
  });

  it('should return "string" for non-date strings', () => {
    expect(identifyTSPrimitiveType('Hello, World!')).toBe('string');
    expect(identifyTSPrimitiveType('123abc')).toBe('string');
  });

  it('should return "boolean" for boolean values', () => {
    expect(identifyTSPrimitiveType(true)).toBe('boolean');
    expect(identifyTSPrimitiveType(false)).toBe('boolean');
  });

  it('should return "object" for objects that are not Date instances', () => {
    expect(identifyTSPrimitiveType({})).toBe('object');
    expect(identifyTSPrimitiveType({ key: 'value' })).toBe('object');
  });

  it('should return "undefined" for undefined', () => {
    expect(identifyTSPrimitiveType(undefined)).toBe('undefined');
  });

  it('should return "function" for functions', () => {
    expect(
      identifyTSPrimitiveType(() => {
        return true;
      }),
    ).toBe('function');
  });

  it('should return "symbol" for symbols', () => {
    expect(identifyTSPrimitiveType(Symbol('symbol'))).toBe('symbol');
  });

  it('should return "bigint" for bigints', () => {
    expect(identifyTSPrimitiveType(BigInt(9007199254740991))).toBe('bigint');
  });

  it('should return "string" for invalid date strings', () => {
    expect(identifyTSPrimitiveType('invalid date')).toBe('string');
  });
});
