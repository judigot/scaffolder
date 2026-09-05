import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import ErrorPage from '@/app/error';
import Loading from '@/app/loading';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders the BFF heading and framework badge', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading').textContent).toBe(
      'Next.js App Router BFF',
    );
    expect(screen.getByTestId('framework-badge').textContent).toBe('Next.js');
    expect(screen.getByText(/GET \/api\/health/).textContent).toContain(
      '/api/hello',
    );
  });
});

describe('Loading', () => {
  it('renders a loading indicator', () => {
    render(<Loading />);
    expect(screen.getByRole('status').textContent).toContain('Loading');
  });
});

describe('ErrorPage', () => {
  it('renders an error message with a retry button', () => {
    render(
      <ErrorPage
        error={new Error('boom')}
        reset={() => {
          return;
        }}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Something went wrong.',
    );
    expect(screen.getByRole('button').textContent).toBe('Try again');
  });
});
