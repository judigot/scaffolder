import { jsx as _jsx } from 'react/jsx-runtime';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../App'; // Assuming your App component contains the buttons and checkbox
import { usersPostsOneToManySchema } from '../../json-schemas';
const backendUrl = 'http://127.0.0.1:8000';
let backendAvailable = false;
/* Check if the backend is available before running tests */
beforeAll(async () => {
  try {
    const response = await fetch(backendUrl);
    if (response.ok) {
      backendAvailable = true;
    } else {
      console.error('Backend is not available. Status:', response.status);
    }
  } catch (error) {
    console.error('Error checking backend availability:', error);
    backendAvailable = false;
  }
});
describe('App Component with API Endpoint and Checkbox', () => {
  it('should check the checkbox, simulate button clicks, and validate the API response object with a single toStrictEqual', async () => {
    if (!backendAvailable) {
      console.error('Backend is not available');
      return;
    }
    // Render the App component
    render(_jsx(App, {}));
    // Get the checkbox and buttons using test ids
    const oneToManyButton = screen.getByTestId('one-to-many-button');
    const includeInsertDataCheckbox = screen.getByTestId(
      'include-insert-data-checkbox',
    );
    const generateAppButton = screen.getByTestId('generate-app-button');
    // Simulate checking the checkbox if it's not already checked
    if (!includeInsertDataCheckbox.checked) {
      fireEvent.click(includeInsertDataCheckbox);
    }
    // Verify the checkbox is checked
    expect(includeInsertDataCheckbox).toBeChecked();
    // Simulate clicking the buttons
    fireEvent.click(oneToManyButton);
    fireEvent.click(generateAppButton);
    // Wait for the API response and validate the result with a single `toStrictEqual`
    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/users/1/posts`);
        if (response.ok) {
          const data = await response.json();
          // Verify the entire API response object with a single `toStrictEqual` using JSON.stringify
          const expectedData = JSON.stringify([
            usersPostsOneToManySchema.post[0],
            usersPostsOneToManySchema.post[1],
          ]);
          expect(JSON.stringify(data)).toStrictEqual(expectedData);
          const response2 = await fetch(`${backendUrl}/api/users/1/post`);
          expect(response2.status).toBe(404);
          const response3 = await fetch(`${backendUrl}/api/orders/1/products`);
          expect(response3.status).toBe(404);
        } else {
          console.error('Failed to fetch data. Status:', response.status);
        }
      } catch (error) {
        console.error('Error during fetch:', error);
        throw error; // Throwing error so that the test fails
      }
    });
  });
});
