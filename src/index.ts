import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Pool from 'pg-pool';
import mysql, { RowDataPacket, FieldPacket } from 'mysql2/promise';
import createModels from '@/utils/createModels';
import clearGeneratedFiles from '@/utils/clearDirectory';
import { frameworkDirectories, frontendDirectories } from '@/constants';
import createAPICalls from '@/utils/createAPICalls';
import createAPIRoutes from '@/utils/createAPIRoutes';
import createControllers from '@/utils/createControllers';
import createServices from '@/utils/createServices';
import createRepositories from '@/utils/createRepositories';
import createTypescriptInterfaces from '@/utils/createTypescriptInterfaces';
import createInterfaces from '@/utils/createInterfaces';
import createResources from '@/utils/createResources';
import convertIntrospectedStructure, {
  ITable,
} from '@/utils/convertIntrospectedStructure';
import { ISchemaInfo } from '@/interfaces/interfaces';
import convertIntrospectedMysqlStructure, {
  ITableMysql,
} from '@/utils/convertIntrospectedMysqlStructure';

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

export const executeMySQL = async (
  connectionString: string,
  queryTemplate: string,
): Promise<Record<string, unknown>[]> => {
  const match = connectionString.match(
    /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
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

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
};

const introspect = async (dbConnection: string): Promise<unknown> => {
  const pgIntrospectionQuery = readSqlFile('introspect_postgresql.sql');
  const mysqlIntrospectionQueryTemplate = readSqlFile('introspect_mysql.sql');

  if (dbConnection.startsWith('postgresql')) {
    const isITableArray = (data: unknown): data is ITable[] => {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            'table_name' in item &&
            'columns' in item &&
            'check_constraints' in item,
        )
      );
    };

    const result = await executePostgreSQL(dbConnection, pgIntrospectionQuery);
    if (isITableArray(result)) {
      return convertIntrospectedStructure(result);
    } else {
      throw new Error('Unexpected result format');
    }
  } else if (dbConnection.startsWith('mysql')) {
    const match = dbConnection.match(
      /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
    );
    if (!match) {
      throw new Error('Invalid MySQL connection string');
    }
    const [, , , , , database] = match;
    const mysqlIntrospectionQuery = mysqlIntrospectionQueryTemplate.replace(
      '$DB_NAME',
      database,
    );
    const isITableArray = (data: unknown): data is ITableMysql[] => {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            'TABLE_NAME' in item &&
            'table_definition' in item,
        )
      );
    };

    const result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
    if (isITableArray(result)) {
      return convertIntrospectedMysqlStructure(result);
    } else {
      throw new Error('Unexpected result format');
    }
  } else {
    throw new Error('Unsupported database type');
  }
};

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
  '/executeCustomSchema',
  (
    req: Request<
      unknown,
      unknown,
      { dbConnection: string; SQLSchemaEditable: string }
    >,
    res: Response,
  ) => {
    void (async () => {
      const { dbConnection, SQLSchemaEditable } = req.body;

      if (!dbConnection) {
        return res
          .status(400)
          .json({ error: 'Database connection string is required' });
      }

      try {
        if (dbConnection.startsWith('postgresql')) {
          await executePostgreSQL(
            dbConnection,
            `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchemaEditable}`,
          );
        } else if (dbConnection.startsWith('mysql')) {
          await executeMySQL(dbConnection, SQLSchemaEditable);
        } else {
          return res.status(400).json({ error: 'Unsupported database type' });
        }

        const introspectionResult = await introspect(dbConnection);
        res.status(200).json(introspectionResult);
      } catch (error: unknown) {
        res.status(500).json({ error });
      }
    })();
  },
);

app.post(
  '/scaffoldProject',
  (
    req: Request<
      unknown,
      unknown,
      {
        schemaInfo: ISchemaInfo[];
        interfaces: string;
        framework: string;
        backendDir: string;
        frontendDir: string;
        dbConnection: string;
        SQLSchema: string;
      }
    >,
    res: Response,
  ) => {
    const {
      schemaInfo,
      interfaces,
      framework: frameworkRaw,
      backendDir,
      frontendDir,
      dbConnection,
      SQLSchema,
    } = req.body;
    const framework = frameworkRaw.toLowerCase();
    const frameworkDir = frameworkDirectories[framework];

    void (async () => {
      const backendDirPath = path.resolve(__dirname, backendDir);
      const frontendDirPath = path.resolve(__dirname, frontendDir);

      let isDBConnectionValid = false;
      const isBackendDirValid = fs.existsSync(backendDirPath);
      const isFrontendDirValid = fs.existsSync(frontendDirPath);
      try {
        if (dbConnection.startsWith('postgresql')) {
          await executePostgreSQL(
            dbConnection,
            `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchema}`,
          );
        }
        if (dbConnection.startsWith('mysql')) {
          await executeMySQL(dbConnection, SQLSchema);
        }
        isDBConnectionValid = true;
      } catch (error: unknown) {
        console.error('Error executing database command:', error);
      }

      try {
        /*=====BACKEND=====*/
        // Routes
        const routesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.routes)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.routes}`,
            );
        createAPIRoutes(schemaInfo, routesDir);

        // Services
        const servicesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.service)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.service}`,
            );
        clearGeneratedFiles(servicesDir);
        createServices(schemaInfo, framework, servicesDir);

        // Controllers
        const controllersDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.controller)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.controller}`,
            );
        clearGeneratedFiles(controllersDir);
        createControllers(schemaInfo, framework, controllersDir);

        // Repositories
        const repositoriesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.repository)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.repository}`,
            );
        clearGeneratedFiles(repositoriesDir);
        createRepositories(schemaInfo, framework, repositoriesDir);

        // Interfaces
        const interfacesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.interface)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.interface}`,
            );
        createInterfaces(schemaInfo, framework, interfacesDir);

        // Repositories
        const resourcesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.resource)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.resource}`,
            );
        clearGeneratedFiles(resourcesDir);
        createResources(schemaInfo, framework, resourcesDir);

        // Models
        const modelsDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.model)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.model}`,
            );
        clearGeneratedFiles(modelsDir);
        createModels(schemaInfo, framework, modelsDir);
        /*=====BACKEND=====*/

        /*=====FRONTEND=====*/
        const APICallsDir = isFrontendDirValid
          ? path.resolve(frontendDirPath, frontendDirectories.apiCalls)
          : path.resolve(
              __dirname,
              `../output/frontend/${frontendDirectories.apiCalls}`,
            );
        clearGeneratedFiles(APICallsDir);
        createAPICalls(schemaInfo, APICallsDir);

        const typescriptInterfacesDir = isFrontendDirValid
          ? path.resolve(frontendDirPath, frontendDirectories.interface)
          : path.resolve(
              __dirname,
              `../output/frontend/${frontendDirectories.interface}`,
            );
        clearGeneratedFiles(typescriptInterfacesDir);
        createTypescriptInterfaces({
          interfaces,
          outputDir: typescriptInterfacesDir,
        });
        /*=====FRONTEND=====*/

        res.status(200).json({
          isBackendDirValid,
          isFrontendDirValid,
          isDBConnectionValid,
        });
      } catch (error) {
        console.error('Error generating models:', error);
        res.status(500).json({
          isBackendDirValid,
          isFrontendDirValid,
          isDBConnectionValid,
        });
      }
    })();
  },
);

app.post(
  '/introspect',
  (req: Request<unknown, unknown, { dbConnection: string }>, res: Response) => {
    const { dbConnection } = req.body;
    if (!dbConnection) {
      return res
        .status(400)
        .json({ error: 'Database connection string is required' });
    }
    void (async () => {
      try {
        const introspectionResult = await introspect(dbConnection);
        res.status(200).json(introspectionResult);
      } catch (error: unknown) {
        res.status(500).json({ error });
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
