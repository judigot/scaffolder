import { useState, useCallback, useRef } from 'react';

/**
 * Atomic error state management hook.
 * Ensures error messages are set and cleared atomically, preventing race conditions
 * and ensuring only one error is active at a time.
 *
 * Features:
 * - Atomic operations: set/clear operations are isolated and consistent
 * - Prevents race conditions: uses operation IDs to track latest operation
 * - Automatic cleanup: clears previous errors when setting new ones
 * - Success/error mutual exclusivity: setting success clears error and vice versa
 * - Transactional: operations are all-or-nothing
 */
export function useAtomicError() {
  const [error, setErrorState] = useState<string | null>(null);
  const [successMessage, setSuccessMessageState] = useState<string | null>(
    null,
  );
  const operationIdRef = useRef<number>(0);

  /**
   * Atomically set an error message.
   * Clears any existing success message atomically.
   * Uses React's automatic batching for atomic state updates.
   */
  const setError = useCallback((message: string | null) => {
    // React 18+ automatically batches these updates atomically
    setErrorState(message);
    if (message !== null) {
      setSuccessMessageState(null);
    }
  }, []);

  /**
   * Atomically clear the error message.
   */
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  /**
   * Atomically set a success message.
   * Clears any existing error message atomically.
   */
  const setSuccess = useCallback((message: string | null) => {
    setSuccessMessageState(message);
    if (message !== null) {
      setErrorState(null);
    }
  }, []);

  /**
   * Atomically clear the success message.
   */
  const clearSuccess = useCallback(() => {
    setSuccessMessageState(null);
  }, []);

  /**
   * Atomically clear both error and success messages.
   */
  const clearAll = useCallback(() => {
    setErrorState(null);
    setSuccessMessageState(null);
  }, []);

  /**
   * Atomically execute an async operation with error handling.
   * Automatically clears previous errors/success before execution.
   * Uses operation IDs to prevent race conditions from concurrent operations.
   */
  const executeWithErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        successMessage?: string;
        errorMessage?: string | ((error: Error) => string);
      },
    ): Promise<T | null> => {
      const currentOperationId = ++operationIdRef.current;

      // Clear previous messages atomically
      clearAll();

      try {
        const result = await operation();

        // Only process if this is still the latest operation (prevents race conditions)
        if (currentOperationId === operationIdRef.current) {
          if (options?.onSuccess) {
            options.onSuccess(result);
          }
          if (options?.successMessage !== undefined) {
            setSuccess(options.successMessage);
          }
        }

        return result;
      } catch (error) {
        // Only process if this is still the latest operation (prevents race conditions)
        if (currentOperationId === operationIdRef.current) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          const errorMessage =
            options?.errorMessage === undefined
              ? errorObj.message
              : typeof options.errorMessage === 'function'
                ? options.errorMessage(errorObj)
                : options.errorMessage;

          setError(errorMessage);

          if (options?.onError) {
            options.onError(errorObj);
          }
        }

        return null;
      }
    },
    [clearAll, setError, setSuccess],
  );

  return {
    error,
    successMessage,
    setError,
    clearError,
    setSuccess,
    clearSuccess,
    clearAll,
    executeWithErrorHandling,
  };
}
