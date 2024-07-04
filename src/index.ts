import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = (process.env.PORT ?? 5000).toString();
const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const publicDirectory = path.join(__dirname, 'public');

app.use(express.json());

// Enable CORS and serve static files
app.use(cors());
app.use(express.static(publicDirectory));

import fs from 'fs';
import Pool from 'pg-pool';
app.post('/api/createFile', (req: Request, _res) => {
  const data = req.body as Record<string, string>;

  const fileName = `${data.targetDirectory}/filename.txt`;
  fs.writeFile(fileName, data.framework, (error) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      return;
    }
  });
});

// Define routes
app.get('/', (_req, res) => {
  const isDevelopment: boolean = String(process.env.NODE_ENV) === 'development';

  if (isDevelopment) {
    res.redirect(String(process.env.VITE_FRONTEND_URL));
    return;
  }

  res.sendFile(publicDirectory);
});

app.get('/api', (_req: Request, res: Response) =>
  res.json({ message: path.join(publicDirectory, 'index.html') }),
);

app.post(
  '/introspect',
  (
    req: Request<
      unknown,
      unknown,
      {
        dbConnection: string;
      }
    >,
    res: Response,
  ) => {
    void (async () => {
      const { dbConnection } = req.body;

      const introspectQuery = `WITH columns_info AS (SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema = 'public'), foreign_keys AS (SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY'), primary_keys AS (SELECT tc.table_schema, tc.table_name, kcu.column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.constraint_type = 'PRIMARY KEY'), unique_constraints AS (SELECT tc.table_schema, tc.table_name, kcu.column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.constraint_type = 'UNIQUE'), check_constraints AS (SELECT tc.table_schema, tc.table_name, cc.check_clause FROM information_schema.table_constraints AS tc JOIN information_schema.check_constraints AS cc ON tc.constraint_name = cc.constraint_name AND tc.table_schema = cc.constraint_schema WHERE tc.constraint_type = 'CHECK') SELECT c.table_name, json_build_object('columns', json_agg(CASE WHEN fk.foreign_table_name IS NOT NULL THEN json_build_object('column_name', c.column_name, 'data_type', c.data_type, 'is_nullable', c.is_nullable, 'column_default', c.column_default, 'primary_key', (pk.column_name IS NOT NULL), 'unique', (uc.column_name IS NOT NULL), 'check_constraints', (SELECT json_agg(check_clause) FROM check_constraints cc WHERE cc.table_schema = c.table_schema AND cc.table_name = c.table_name), 'foreign_key', json_build_object('foreign_table_name', fk.foreign_table_name, 'foreign_column_name', fk.foreign_column_name)) ELSE json_build_object('column_name', c.column_name, 'data_type', c.data_type, 'is_nullable', c.is_nullable, 'column_default', c.column_default, 'primary_key', (pk.column_name IS NOT NULL), 'unique', (uc.column_name IS NOT NULL), 'check_constraints', (SELECT json_agg(check_clause) FROM check_constraints cc WHERE cc.table_schema = c.table_schema AND cc.table_name = c.table_name), 'foreign_key', NULL) END ORDER BY c.ordinal_position)) AS table_definition FROM columns_info c LEFT JOIN foreign_keys fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name LEFT JOIN primary_keys pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name LEFT JOIN unique_constraints uc ON c.table_schema = uc.table_schema AND c.table_name = uc.table_name AND c.column_name = uc.column_name GROUP BY c.table_name ORDER BY c.table_name;`;

      if (!dbConnection) {
        return res
          .status(400)
          .json({ error: 'Database connection string is required' });
      }

      // Create a new pool with the provided connection string
      const pool = new Pool({ connectionString: dbConnection });

      try {
        const client = await pool.connect();
        try {
          const result = await client.query(introspectQuery);
          res.json(result.rows);
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    })();
  },
);

// Start server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on http://localhost:${PORT}`,
  );
});
