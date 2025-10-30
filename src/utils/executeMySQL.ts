import type { RowDataPacket, FieldPacket } from 'mysql2';
import mysql from 'mysql2/promise.js';

export const executeMySQL = async (
  connectionString: string,
  queryTemplate: string,
): Promise<Record<string, unknown>[]> => {
  const match = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/.exec(
    connectionString,
  );
  if (!match) {
    throw new Error('Invalid MySQL connection string');
  }

  const [, user, password, host, port, database] = match;
  const query = queryTemplate.replace('$DB_NAME', database);

  try {
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
      multipleStatements: true,
    });
    try {
      const [rows]: [RowDataPacket[], FieldPacket[]] =
        await connection.query(query);
      return rows;
    } finally {
      await connection.end();
    }
  } catch (err) {
    console.error('MySQL introspection error:', err);
    throw new Error('Internal Server Error');
  }
};
