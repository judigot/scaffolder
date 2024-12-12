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
    console.error('PostgreSQL introspection error:', err);
    throw new Error('Internal Server Error');
  }
};
