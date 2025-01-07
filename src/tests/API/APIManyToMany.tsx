import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App.tsx'; // Assuming your App component contains the buttons and checkbox

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
    render(<App />);

    // Get the checkbox and buttons using test ids
    const oneToOneButton = screen.getByTestId('many-to-many-button');
    const includeInsertDataCheckbox: HTMLInputElement = screen.getByTestId(
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
    fireEvent.click(oneToOneButton);
    fireEvent.click(generateAppButton);

    // Wait for the API response and validate the result with a single `toStrictEqual`
    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/orders/1/products`);
        if (response.ok) {
          const data: unknown = await response.json();

          // Verify the entire API response object with a single `toStrictEqual` using JSON.stringify
          const expectedData = JSON.stringify([
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

          expect(JSON.stringify(data)).toStrictEqual(expectedData);

          const response2 = await fetch(`${backendUrl}/api/users/1/post`);
          expect(response2.status).toBe(404);

          const response3 = await fetch(`${backendUrl}/api/users/1/posts`);
          expect(response3.status).toBe(404);
        } else {
          console.error('Failed to fetch data. Status:', response.status);
        }
      } catch (error) {
        console.error('Error during fetch:', error);
        throw error;
      }
    });
  });
});
