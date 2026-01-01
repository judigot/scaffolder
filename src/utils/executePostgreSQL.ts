import Pool from 'pg-pool';

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

    if (err instanceof Error) {
      errorMessage = err.message;

      // Check if error has position property (pg library error objects have this)
      interface IPgError extends Error {
        position?: number;
        detail?: string;
        hint?: string;
      }

      const pgError: IPgError = err;

      if (pgError.position !== undefined) {
        const position = pgError.position;
        // Calculate line number from character position
        const linesBeforePosition = query
          .substring(0, position - 1)
          .split('\n');
        const lineNumber = linesBeforePosition.length;

        // If error message doesn't already include line number, add it
        if (!errorMessage.includes('LINE')) {
          errorMessage = `${errorMessage} (at line ${String(lineNumber)}, position ${String(position)})`;
        } else {
          // If it already has LINE, ensure we also show position if available
          errorMessage = `${errorMessage} (position ${String(position)})`;
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

    throw new Error(`PostgreSQL error: ${errorMessage}`);
  }
};
