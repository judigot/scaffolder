import Pool from 'pg-pool';
export const executePostgreSQL = async (connectionString, query) => {
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(query);
      return rows;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PostgreSQL introspection error:', err);
    throw new Error('Internal Server Error');
  }
};
