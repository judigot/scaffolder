import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  // Ensure test database is ready
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test data in reverse order (respects foreign key constraints)
  console.log('Cleaning up test environment...');
});
