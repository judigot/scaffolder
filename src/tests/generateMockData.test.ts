import { describe, it, expect } from 'vitest';
import generateMockData from '@/utils/generateMockData';

describe('generateMockData', () => {
  it('should generate consistent mock data', () => {
    const data = {
      customer: [
        {
          customer_id: 1,
          email: 'john@example.com',
          name: 'John Doe',
          is_active: true,
        },
        {
          customer_id: 2,
          email: 'jane@example.com',
          name: null,
          is_active: false,
        },
      ],
      product: [
        { product_id: 1, product_name: 'Water', sku: null, price: 10.5 },
        { product_id: 2, product_name: 'Yogurt', sku: '12345', price: 20 },
      ],
    };

    const mockData = generateMockData(data);

    // Ensure mock data structure is consistent
    Object.entries(data).forEach(([tableName, records]) => {
      const sampleRecord = records[0] as Record<string, unknown>;

      expect(mockData[tableName]).toHaveLength(10);

      // Check that all necessary fields are present
      Object.keys(sampleRecord).forEach((key) => {
        mockData[tableName].forEach((record) => {
          expect(record).toHaveProperty(key);
        });
      });

      // Check that some values are null where applicable
      const nullableFields = Object.keys(sampleRecord).filter((key) =>
        records.some(
          (record) => (record as Record<string, unknown>)[key] === null,
        ),
      );

      nullableFields.forEach((key) => {
        const fieldValues = mockData[tableName].map((record) => record[key]);
        expect(fieldValues).toContain(null);
      });

      // Check data types are consistent
      mockData[tableName].forEach((record) => {
        Object.entries(sampleRecord).forEach(([key, value]) => {
          if (value === null) {
            expect(typeof record[key]).toMatch(
              /string|number|boolean|object|null/,
            );
          } else {
            expect(typeof record[key]).toBe(typeof value);
          }
        });
      });
    });
  });
});
