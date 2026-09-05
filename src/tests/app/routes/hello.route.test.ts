import { describe, expect, it } from 'vitest';
import helloRouter from '@/app/routes/hello.ts';

describe('GET /hello', () => {
  it('returns Hello, world!', async () => {
    const response = await helloRouter.request('/');
    expect(response.status).toBe(200);
    const payload: unknown = await response.json();
    expect(payload).toEqual({ message: 'Hello, world!' });
  });
});
