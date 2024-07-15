import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Pool from 'pg-pool';
import mysql, { RowDataPacket, FieldPacket } from 'mysql2/promise';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import createModels from '@/utils/createModels';
import createAPICalls from '@/utils/createAPICalls';
import clearGeneratedFiles from '@/utils/clearDirectory';
import { frameworkDirectories } from '@/constants';
import createControllers from '@/utils/createControllers';

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

app.post('/api/createFile', (req: Request, _res) => {
  const data = req.body as Record<string, string>;

  const fileName = `${data.targetDirectory}/filename.txt`;
  fs.writeFile(fileName, data.framework, (error) => {
    if (error) {
      /* eslint-disable-next-line no-console */
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
  '/scaffoldProject',
  (
    req: Request<
      unknown,
      unknown,
      {
        relationships: IRelationshipInfo[];
        interfaces: string[];
        framework: string;
        backendDir: string;
        frontendDir: string;
      }
    >,
    res: Response,
  ) => {
    const {
      relationships,
      framework: frameworkRaw,
      backendDir,
      frontendDir,
    } = req.body;
    const framework = frameworkRaw.toLowerCase();

    const frameworkDir = frameworkDirectories[framework];

    try {
      const resolvedBackendDir = fs.existsSync(
        path.resolve(__dirname, backendDir),
      )
        ? path.resolve(__dirname, `${backendDir}/${frameworkDir.model}`)
        : path.resolve(
            __dirname,
            `../output/backend/${framework}/${frameworkDir.model}`,
          );

      const resolvedFrontendDir = fs.existsSync(
        path.resolve(__dirname, frontendDir),
      )
        ? path.resolve(__dirname, `${frontendDir}/src`)
        : path.resolve(__dirname, '../output/frontend/src/api');

      clearGeneratedFiles(resolvedBackendDir);
      clearGeneratedFiles(resolvedFrontendDir);
      clearGeneratedFiles(path.resolve(__dirname, `${backendDir}/${frameworkDir.controller}`));


      createModels(relationships, framework, resolvedBackendDir);
      createControllers(relationships, framework, path.resolve(__dirname, `${backendDir}/${frameworkDir.controller}`));

      createAPICalls(relationships, resolvedFrontendDir);

      res.send('Models generated successfully');
    } catch (error) {
      console.error('Error generating models:', error);
      res.status(500).send('Error generating models');
    }
  },
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
    const readSqlFile = (filename: string): string => {
      return fs.readFileSync(path.join(__dirname, filename), 'utf8');
    };
    void (async () => {
      const { dbConnection } = req.body;

      if (!dbConnection) {
        return res
          .status(400)
          .json({ error: 'Database connection string is required' });
      }

      const pgIntrospectionQuery = readSqlFile('introspect_postgresql.sql');
      const mysqlIntrospectionQueryTemplate = readSqlFile(
        'introspect_mysql.sql',
      );

      const introspectPostgres = async (connectionString: string) => {
        const pool = new Pool({ connectionString });

        try {
          const client = await pool.connect();
          try {
            const result = await client.query(pgIntrospectionQuery);
            res.json(result.rows);
          } finally {
            client.release();
          }
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      };

      const introspectMysql = async (connectionString: string) => {
        const match = connectionString.match(
          /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
        );
        if (!match) {
          return res
            .status(400)
            .json({ error: 'Invalid MySQL connection string' });
        }

        const [, user, password, host, port, database] = match;
        const mysqlIntrospectionQuery = mysqlIntrospectionQueryTemplate.replace(
          '$DB_NAME',
          database,
        );

        try {
          const connection = await mysql.createConnection({
            host,
            port: parseInt(port, 10),
            user,
            password,
            database,
          });
          try {
            const [rows]: [RowDataPacket[], FieldPacket[]] =
              await connection.execute(mysqlIntrospectionQuery);
            res.json(rows);
          } finally {
            await connection.end();
          }
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      };

      if (dbConnection.startsWith('postgresql')) {
        await introspectPostgres(dbConnection);
      } else if (dbConnection.startsWith('mysql')) {
        await introspectMysql(dbConnection);
      } else {
        res.status(400).json({ error: 'Unsupported database type' });
      }
    })();
  },
);

// Start server
app.listen(PORT, () => {
  /* eslint-disable-next-line no-console */
  console.log(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on http://localhost:${PORT}`,
  );
});
