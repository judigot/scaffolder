/**
 * Centralized error handler for API calls
 * @param error - The thrown error
 * @param contextMessage - Descriptive context of what failed
 */
export function handleError(error: unknown, contextMessage: string): never {
  if (typeof error === 'string') {
    throw new Error(`${contextMessage}: ${error}`);
  }
  if (error instanceof Error) {
    throw new Error(`${contextMessage}: ${error.message}`);
  }
  throw new Error(`${contextMessage}: An unknown error occurred`);
}