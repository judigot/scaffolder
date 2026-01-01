import Pool from 'pg-pool';

export interface IPostgreSQLExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorLine?: number;
  errorPosition?: number;
}

interface IErrorWithDetails extends Error {
  errorLine?: number;
  errorPosition?: number;
}

export const executePostgreSQL = async (
  connectionString: string,
  query: string,
): Promise<unknown> => {
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    try {
      const { rows }: { rows: Record<string, unknown>[] } =
        await client.query(query);
      return rows;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PostgreSQL execution error:', err);

    // Extract error details from pg error object
    let errorMessage = 'Unknown PostgreSQL error';
    let errorLine: number | undefined;
    let errorPosition: number | undefined;

    // Check if error has position property (pg library error objects have this)
    interface IPgError extends Error {
      position?: number;
      detail?: string;
      hint?: string;
    }

    if (err instanceof Error) {
      errorMessage = err.message;
      const pgError: IPgError = err;

      if (pgError.position !== undefined) {
        errorPosition = pgError.position;
        // Calculate line number from character position
        const linesBeforePosition = query
          .substring(0, errorPosition - 1)
          .split('\n');
        errorLine = linesBeforePosition.length;

        // If error message doesn't already include line number, add it
        if (!errorMessage.includes('LINE')) {
          errorMessage = `${errorMessage} (at line ${String(errorLine)}, position ${String(errorPosition)})`;
        } else {
          // If it already has LINE, ensure we also show position if available
          errorMessage = `${errorMessage} (position ${String(errorPosition)})`;
        }
      }

      // Include detail and hint if available
      if (pgError.detail !== undefined && pgError.detail !== '') {
        errorMessage = `${errorMessage}\nDetail: ${pgError.detail}`;
      }
      if (pgError.hint !== undefined && pgError.hint !== '') {
        errorMessage = `${errorMessage}\nHint: ${pgError.hint}`;
      }
    }

    const error: IErrorWithDetails = new Error(
      `PostgreSQL error: ${errorMessage}`,
    );
    error.errorLine = errorLine;
    error.errorPosition = errorPosition;
    throw error;
  }
};
