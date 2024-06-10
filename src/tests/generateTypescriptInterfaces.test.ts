import generateTypescriptInterfaces from '@/utils/generateTypeScriptInterfaces';
import { describe, it, expect } from 'vitest';

describe('generateTypescriptInterfaces', () => {
  it('should generate consistent TypeScript interfaces', () => {
    const data = {
      customer: [
        { customer_id: 1, email: 'john@example.com', name: 'John Doe' },
        { customer_id: 2, email: 'jane@example.com', name: 'Jane Doe' },
      ],
    };

    const result = generateTypescriptInterfaces(data);
    expect(result).toContain('interface Customer');
    expect(result).toContain('customer_id: number;');
    expect(result).toContain('email: string;');
    expect(result).toContain('name: string;');
  });

  it('should handle nullable fields correctly', () => {
    const data = {
      product: [
        { product_id: 1, product_name: 'Water', sku: null },
        { product_id: 2, product_name: 'Yogurt', sku: '12345' },
      ],
    };

    const result = generateTypescriptInterfaces(data);
    expect(result).toContain('interface Product');
    expect(result).toContain('product_id: number;');
    expect(result).toContain('product_name: string;');
    expect(result).toContain('sku?: string;');
  });

  it('should generate interfaces for multiple tables', () => {
    const data = {
      customer: [
        { customer_id: 1, email: 'john@example.com', name: 'John Doe' },
      ],
      order: [{ order_id: 1, customer_id: 1 }],
    };

    const result = generateTypescriptInterfaces(data);
    expect(result).toContain('interface Customer');
    expect(result).toContain('interface Order');
  });
});
