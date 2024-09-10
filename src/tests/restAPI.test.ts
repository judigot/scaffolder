import { describe, it, expect, beforeAll } from 'vitest';

const backendUrl = 'http://127.0.0.1:8000';

let backendAvailable = false;

/* Check if the backend is available before running tests */
beforeAll(async () => {
  try {
    const response = await fetch(String(backendUrl));
    if (response.ok) {
      backendAvailable = true;
    }
  } catch (error: unknown) {
    backendAvailable = false;
  }
});

describe('API Endpoints', () => {
  it('should only allow one valid response among the three endpoints', async () => {
    if (!backendAvailable) {
      return;
    }

    let successCount = 0;

    try {
      const response = await fetch(`${String(backendUrl)}/api/users/1/post`);
      if (response.ok) {
        const data: unknown = await response.json();
        expect(data).toEqual({
          post_id: 1,
          user_id: 1,
          title: "John's Post",
          content: 'Lorem ipsum',
          created_at: '2023-06-18T10:17:19.846000Z',
          updated_at: '2024-06-18T10:17:19.846000Z',
        });
        successCount++;
      }
    } catch (error: unknown) {
      /* Expected to fail if not the valid endpoint */
    }

    try {
      const response = await fetch(`${String(backendUrl)}/api/users/1/posts`);
      if (response.ok) {
        const data: unknown = await response.json();
        expect(data).toEqual([
          {
            post_id: 1,
            user_id: 1,
            title: "John's Post",
            content: 'Lorem ipsum',
            created_at: '2023-06-18T10:17:19.846000Z',
            updated_at: '2024-06-18T10:17:19.846000Z',
          },
          {
            post_id: 2,
            user_id: 1,
            title: "John's 2nd Post",
            content: 'Lorem ipsum',
            created_at: '2023-06-18T10:17:19.846000Z',
            updated_at: '2024-06-18T10:17:19.846000Z',
          },
        ]);
        successCount++;
      }
    } catch (error: unknown) {
      /* Expected to fail if not the valid endpoint */
    }

    try {
      const response = await fetch(
        `${String(backendUrl)}/api/orders/1/products`,
      );
      if (response.ok) {
        const data: unknown = await response.json();
        expect(data).toEqual([
          {
            product_id: 1,
            product_name: 'Water',
            pivot: {
              order_id: 1,
              product_id: 1,
            },
          },
          {
            product_id: 2,
            product_name: 'Yogurt',
            pivot: {
              order_id: 1,
              product_id: 2,
            },
          },
        ]);
        successCount++;
      }
    } catch (error: unknown) {
      /* Expected to fail if not the valid endpoint */
    }

    expect(successCount).toBe(1); /* Ensure exactly one successful response */
  });
});
