import { describe, expect, it } from 'vitest';
import { changeCase } from '@/utils/common.ts';

describe('changeCase', () => {
  it('keeps already-camelCase identifiers such as userId', () => {
    expect(changeCase('userId').camelCase).toBe('userId');
    expect(changeCase('createdAt').camelCase).toBe('createdAt');
    expect(changeCase('hashed_password').camelCase).toBe('hashedPassword');
  });

  it('still converts snake_case table and column names', () => {
    expect(changeCase('user_id').camelCase).toBe('userId');
    expect(changeCase('order_product').pascalCase).toBe('OrderProduct');
  });
});
