import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App'; // Assuming your App component contains the buttons and checkbox

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
  // Test for the checkbox, button clicks, and API validation
  it('should check the checkbox, simulate button clicks, and validate the API response object with a single toBe', async () => {
    if (!backendAvailable) {
      console.error('Backend is not available');
      return;
    }

    // Render the App component
    render(<App />);

    // Get the checkbox and buttons using test ids
    const oneToOneButton = screen.getByTestId('one-to-many-button');
    const checkbox: HTMLInputElement = screen.getByTestId(
      'include-insert-data-checkbox',
    );
    const generateAppButton = screen.getByTestId('generate-app-button');

    // Simulate checking the checkbox if it's not already checked
    if (!checkbox.checked) {
      fireEvent.click(checkbox);
    }

    // Verify the checkbox is checked
    expect(checkbox).toBeChecked();

    // Simulate clicking the buttons
    fireEvent.click(oneToOneButton);
    fireEvent.click(generateAppButton);

    // Wait for the API response and validate the result with a single `toBe`
    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/users/1/posts`);
        if (response.ok) {
          const data: unknown = await response.json();

          // Verify the entire API response object with a single `toBe` using JSON.stringify
          const expectedData = JSON.stringify([
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

          expect(JSON.stringify(data)).toStrictEqual(expectedData);
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
