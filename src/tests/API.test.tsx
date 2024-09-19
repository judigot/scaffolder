import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App';

const backendUrl = 'http://127.0.0.1:8000';

let backendAvailable = false;

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
  it('should check the checkbox, simulate button clicks, and validate the one-to-one API response object with a single toStrictEqual', async () => {
    if (!backendAvailable) {
      console.error('Backend is not available');
      return;
    }

    render(<App />);

    const oneToOneButton = screen.getByTestId('one-to-one-button');
    const checkbox: HTMLInputElement = screen.getByTestId(
      'include-insert-data-checkbox',
    );
    const generateAppButton = screen.getByTestId('generate-app-button');

    if (!checkbox.checked) {
      fireEvent.click(checkbox);
    }

    expect(checkbox).toBeChecked();

    fireEvent.click(oneToOneButton);
    fireEvent.click(generateAppButton);

    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/users/1/post`);
        if (response.ok) {
          const data: unknown = await response.json();
          const expectedData = JSON.stringify({
            post_id: 1,
            user_id: 1,
            title: "John's Post",
            content: 'Lorem ipsum',
            created_at: '2023-06-18T10:17:19.846000Z',
            updated_at: '2024-06-18T10:17:19.846000Z',
          });
          expect(JSON.stringify(data)).toStrictEqual(expectedData);
        } else {
          console.error('Failed to fetch data. Status:', response.status);
        }
      } catch (error) {
        console.error('Error during fetch:', error);
        throw error;
      }
    });
  });

  it('should check the checkbox, simulate button clicks, and validate the one-to-many API response object with a single toStrictEqual', async () => {
    if (!backendAvailable) {
      console.error('Backend is not available');
      return;
    }

    render(<App />);

    const oneToManyButton = screen.getByTestId('one-to-many-button');
    const checkbox: HTMLInputElement = screen.getByTestId(
      'include-insert-data-checkbox',
    );
    const generateAppButton = screen.getByTestId('generate-app-button');

    if (!checkbox.checked) {
      fireEvent.click(checkbox);
    }

    expect(checkbox).toBeChecked();

    fireEvent.click(oneToManyButton);
    fireEvent.click(generateAppButton);

    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/users/1/posts`);
        if (response.ok) {
          const data: unknown = await response.json();
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
        throw error;
      }
    });
  });

  it('should check the checkbox, simulate button clicks, and validate the many-to-many API response object with a single toStrictEqual', async () => {
    if (!backendAvailable) {
      console.error('Backend is not available');
      return;
    }

    render(<App />);

    const manyToManyButton = screen.getByTestId('many-to-many-button');
    const checkbox: HTMLInputElement = screen.getByTestId(
      'include-insert-data-checkbox',
    );
    const generateAppButton = screen.getByTestId('generate-app-button');

    if (!checkbox.checked) {
      fireEvent.click(checkbox);
    }

    expect(checkbox).toBeChecked();

    fireEvent.click(manyToManyButton);
    fireEvent.click(generateAppButton);

    await waitFor(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/orders/1/products`);
        if (response.ok) {
          const data: unknown = await response.json();
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
