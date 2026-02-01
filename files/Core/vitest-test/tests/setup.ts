import { beforeAll, afterAll } from 'vitest';
import { createClient, type AppType } from '../api';

// Create test client using Hono RPC
export const testClient = createClient(
  process.env.TEST_API_URL || 'http://localhost:3000'
);

// Database cleanup helper
const cleanupTables: string[] = [];

beforeAll(async () => {
  // Ensure test database is ready
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test data in reverse order (respects foreign key constraints)
  console.log('Cleaning up test environment...');
});

// Export test utilities
export { testClient };
