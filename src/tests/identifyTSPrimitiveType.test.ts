import { describe, it, expect } from 'vitest';
import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType';

describe('identifyTSPrimitiveType', () => {
  it('should return "number" for integers', () => {
    expect(identifyTSPrimitiveType(42)).toStrictEqual('number');
    expect(identifyTSPrimitiveType(-42)).toStrictEqual('number');
  });

  it('should return "float" for floating-point numbers', () => {
    expect(identifyTSPrimitiveType(42.5)).toStrictEqual('float');
    expect(identifyTSPrimitiveType(-42.5)).toStrictEqual('float');
  });

  it('should return "Date" for Date objects', () => {
    expect(identifyTSPrimitiveType(new Date())).toStrictEqual('Date');
  });

  it('should return "Date" for valid date strings', () => {
    expect(identifyTSPrimitiveType('2023-08-30T12:00:00Z')).toStrictEqual('Date');
    expect(identifyTSPrimitiveType('2023-08-30')).toStrictEqual('Date');
  });

  it('should return "string" for non-date strings', () => {
    expect(identifyTSPrimitiveType('Hello, World!')).toStrictEqual('string');
    expect(identifyTSPrimitiveType('123abc')).toStrictEqual('string');
  });

  it('should return "boolean" for boolean values', () => {
    expect(identifyTSPrimitiveType(true)).toStrictEqual('boolean');
    expect(identifyTSPrimitiveType(false)).toStrictEqual('boolean');
  });

  it('should return "object" for objects that are not Date instances', () => {
    expect(identifyTSPrimitiveType({})).toStrictEqual('object');
    expect(identifyTSPrimitiveType({ key: 'value' })).toStrictEqual('object');
  });

  it('should return "undefined" for undefined', () => {
    expect(identifyTSPrimitiveType(undefined)).toStrictEqual('undefined');
  });

  it('should return "function" for functions', () => {
    expect(
      identifyTSPrimitiveType(() => {
        return true;
      }),
    ).toStrictEqual('function');
  });

  it('should return "symbol" for symbols', () => {
    expect(identifyTSPrimitiveType(Symbol('symbol'))).toStrictEqual('symbol');
  });

  it('should return "bigint" for bigints', () => {
    expect(identifyTSPrimitiveType(BigInt(9007199254740991))).toStrictEqual('bigint');
  });

  it('should return "string" for invalid date strings', () => {
    expect(identifyTSPrimitiveType('invalid date')).toStrictEqual('string');
  });
});
