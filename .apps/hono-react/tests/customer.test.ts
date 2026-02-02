import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

/**
 * CRUD Testing Pattern: C → R → U → R → D → R
 *
 * This pattern ensures complete lifecycle testing:
 * 1. CREATE - Create a new record
 * 2. READ   - Verify the created record
 * 3. UPDATE - Modify the record
 * 4. READ   - Verify the update
 * 5. DELETE - Remove the record
 * 6. READ   - Verify deletion (404)
 */
describe('Customer API - CRUD Testing (C→R→U→R→D→R)', () => {
  let createdId: number;

  // Test data - using mock values for each column
  const testData = {
    name: 'test-name',
  };

  const updateData = {
    name: 'updated-name',
  };

  // 1. CREATE - Create new record
  it('should CREATE a new customer', async () => {
    const res = await fetch(`${BASE_URL}/api/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    createdId = data.id;
  });

  // 2. READ - Read after create
  it('should READ the created customer', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/${createdId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdId);
  });

  // 3. UPDATE - Update the record
  it('should UPDATE the customer', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    expect(res.status).toBe(200);
  });

  // 4. READ - Read after update
  it('should READ the updated customer', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/${createdId}`);
    expect(res.status).toBe(200);
  });

  // 5. DELETE - Delete the record
  it('should DELETE the customer', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/${createdId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
  });

  // 6. READ - Read after delete (should 404)
  it('should return 404 after DELETE', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/${createdId}`);
    expect(res.status).toBe(404);
  });
});
