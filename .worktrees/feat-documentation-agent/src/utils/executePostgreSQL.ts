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

    // PostgreSQL error objects from node-postgres have these properties
    interface IPgError extends Error {
      position?: number;
      line?: string;
      where?: string;
      detail?: string;
      hint?: string;
      code?: string;
      severity?: string;
      file?: string;
      routine?: string;
      schema?: string;
      table?: string;
      column?: string;
    }

    if (err instanceof Error) {
      // Use raw error message without any modifications
      errorMessage = err.message;
      const pgError: IPgError = err;

      if (pgError.position !== undefined) {
        errorPosition = pgError.position;

        // Extract line number from PostgreSQL error message if it includes LINE
        // Format: "syntax error at or near "," LINE 122: ,"
        // PostgreSQL includes LINE in the message, not as a separate property
        const lineMatch = /LINE (\d+)/.exec(errorMessage);
        if (lineMatch !== null) {
          // Use PostgreSQL's LINE number from the message (this is the accurate line number)
          errorLine = Number.parseInt(lineMatch[1], 10);
        } else {
          // Fallback: Calculate line number from character position if LINE not in message
          const linesBeforePosition = query
            .substring(0, errorPosition - 1)
            .split('\n');
          errorLine = linesBeforePosition.length;
        }
      }

      // Include detail and hint if available (these are part of the raw error structure)
      if (pgError.detail !== undefined && pgError.detail !== '') {
        errorMessage = `${errorMessage}\nDetail: ${pgError.detail}`;
      }
      if (pgError.hint !== undefined && pgError.hint !== '') {
        errorMessage = `${errorMessage}\nHint: ${pgError.hint}`;
      }
    }

    const error: IErrorWithDetails = new Error(errorMessage);
    error.errorLine = errorLine;
    error.errorPosition = errorPosition;
    throw error;
  }
};
