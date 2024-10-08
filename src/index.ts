import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Pool from 'pg-pool';
import mysql, { RowDataPacket, FieldPacket } from 'mysql2/promise';
import createModels from '@/utils/backend/laravel/createModels';
import clearGeneratedFiles from '@/utils/clearDirectory';
import { frameworkDirectories, frontendDirectories } from '@/constants';
import createAPICalls from '@/utils/frontend/createAPICalls';
import createAPIRoutes from '@/utils/backend/laravel/createAPIRoutes';
import createControllers from '@/utils/backend/laravel/createControllers';
import createServices from '@/utils/backend/laravel/createServices';
import createRepositories from '@/utils/backend/laravel/createRepositories';
import createTypescriptInterfaces from '@/utils/frontend/createTypescriptInterfaces';
import createInterfaces from '@/utils/backend/laravel/createInterfaces';
import createResources from '@/utils/backend/laravel/createResources';
import { ISchemaInfo, isITableArray } from '@/interfaces/interfaces';
import createAppServiceProviderScaffolding from '@/utils/backend/laravel/createAppServiceProviderScaffolding';
import introspect from '@/utils/introspect';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure';
import http from 'http';
import https from 'https';
import createBaseFile from '@/utils/backend/laravel/createBaseFile';

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
        if (extractDBConnectionInfo(dbConnection).dbType === 'postgresql') {
          await executePostgreSQL(
            dbConnection,
            `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchemaEditable}`,
          );
        } else if (extractDBConnectionInfo(dbConnection).dbType === 'mysql') {
          await executeMySQL(
            dbConnection,
            `
            USE $DB_NAME;

            SET FOREIGN_KEY_CHECKS = 0;

            SET @tables = NULL;
            SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
            FROM information_schema.tables 
            WHERE table_schema = (SELECT DATABASE());

            SET @tables = IFNULL(@tables, 'dummy');
            SET @sql = CONCAT('DROP TABLE IF EXISTS ', @tables);
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;

            SET FOREIGN_KEY_CHECKS = 1;
            ${SQLSchemaEditable}`,
          );
        } else {
          return res.status(400).json({ error: 'Unsupported database type' });
        }
        const introspectionResult = await introspect(dbConnection);
        if (isITableArray(introspectionResult)) {
          const schemaInfo = convertIntrospectedStructure(introspectionResult);
          res.status(200).json(schemaInfo);
        }
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
        SQLSchema: string | null;
        outputOnSingleFile: boolean;
        backendUrl: string;
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
      outputOnSingleFile,
      backendUrl,
    } = req.body;
    const framework = frameworkRaw.toLowerCase();
    const frameworkDir = frameworkDirectories[framework];

    void (async () => {
      const backendDirPath = path.resolve(__dirname, backendDir);
      const frontendDirPath = path.resolve(__dirname, frontendDir);

      let isDBConnectionValid = false;
      const checkBackendUrlValidity = (
        backendUrl: string,
      ): Promise<boolean> => {
        return new Promise((resolve) => {
          try {
            const parsedUrl = new URL(backendUrl); // Use the WHATWG URL API
            const request =
              parsedUrl.protocol === 'https:' ? https.get : http.get;

            request(backendUrl, (res) => {
              // Check for successful response codes (2xx)
              if (
                res.statusCode != null &&
                res.statusCode >= 200 &&
                res.statusCode < 300
              ) {
                resolve(true);
              } else {
                resolve(false);
              }
            }).on('error', () => {
              resolve(false);
            });
          } catch (error) {
            // If URL construction fails, resolve as false
            // eslint-disable-next-line no-console
            /* prettier-ignore */ ((log = error)=>{console.log(["string","number"].includes(typeof log)?log:JSON.stringify(log,null,4));})();
            resolve(false);
          }
        });
      };
      const isBackendDirValid = fs.existsSync(backendDirPath);
      const isFrontendDirValid = fs.existsSync(frontendDirPath);

      if (SQLSchema != null) {
        try {
          if (extractDBConnectionInfo(dbConnection).dbType === 'postgresql') {
            await executePostgreSQL(
              dbConnection,
              `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchema}`,
            );
          }
          if (extractDBConnectionInfo(dbConnection).dbType === 'mysql') {
            await executeMySQL(
              dbConnection,
              `
                SET FOREIGN_KEY_CHECKS = 0;
                
                -- Prepare the drop statements for all tables in the specified database
                SET @drop := (
                  SELECT CONCAT(
                    'DROP TABLE IF EXISTS \`',
                    GROUP_CONCAT(table_name SEPARATOR '\`, \`'),
                    '\`;'
                  )
                  FROM information_schema.tables
                  WHERE table_schema = '${extractDBConnectionInfo(dbConnection).dbName}'
                );
              
                -- Execute the drop statements
                PREPARE stmt FROM @drop;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
              
                -- Re-enable foreign key checks
                SET FOREIGN_KEY_CHECKS = 1;
              
                -- Execute the provided SQL schema to create new tables
                ${SQLSchema}
                `,
            );
          }
          isDBConnectionValid = true;
        } catch (error: unknown) {
          console.error('Error executing database command:', error);
        }
      } else {
        isDBConnectionValid = true;
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
        createBaseFile(framework, controllersDir, 'controller');
        createControllers(schemaInfo, framework, controllersDir);

        // Repositories
        const repositoriesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.repository)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.repository}`,
            );
        clearGeneratedFiles(repositoriesDir);
        createBaseFile(framework, repositoriesDir, 'repository');
        createRepositories(schemaInfo, framework, repositoriesDir);

        // Interfaces
        const interfacesDir = isBackendDirValid
          ? path.resolve(backendDirPath, frameworkDir.interface)
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/${frameworkDir.interface}`,
            );
        createBaseFile(framework, interfacesDir, 'repositoryInterface');
        createInterfaces(schemaInfo, framework, interfacesDir);

        // Resources
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

        const serviceProviderDir = isBackendDirValid
          ? path.resolve(backendDirPath, 'app/Providers')
          : path.resolve(
              __dirname,
              `../output/backend/${framework}/app/Providers`,
            );
        createAppServiceProviderScaffolding({
          schemaInfo,
          outputDir: serviceProviderDir,
          recreateFile: !isBackendDirValid,
        });

        /*=====BACKEND=====*/

        /*=====FRONTEND=====*/
        const APICallsDir = isFrontendDirValid
          ? path.resolve(frontendDirPath, frontendDirectories.apiCalls)
          : path.resolve(
              __dirname,
              `../output/frontend/${frontendDirectories.apiCalls}`,
            );
        clearGeneratedFiles(APICallsDir);
        createAPICalls(schemaInfo, APICallsDir, outputOnSingleFile, backendUrl);

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

        checkBackendUrlValidity(backendUrl)
          .then((isBackendUrlValid) => {
            // Success
            res.status(200).json({
              isBackendUrlValid,
              isBackendDirValid,
              isFrontendDirValid,
              isDBConnectionValid,
            });
          })
          .catch((error: unknown) => {
            // Failure
            if (typeof error === `string`) {
              throw Error(`There was an error: error`);
            }
            if (error instanceof Error) {
              throw Error(`There was an error: ${error.message}`);
            }
          })
          .finally(() => {
            // Finally
          });
      } catch (error) {
        console.error('Error generating models:', error);
        checkBackendUrlValidity(backendUrl)
          .then(() => {
            // Success
            res.status(500).json({
              isBackendUrlValid: false,
              isBackendDirValid,
              isFrontendDirValid,
              isDBConnectionValid,
            });
          })
          .catch((error: unknown) => {
            // Failure
            if (typeof error === `string`) {
              throw Error(`There was an error: error`);
            }
            if (error instanceof Error) {
              throw Error(`There was an error: ${error.message}`);
            }
          })
          .finally(() => {
            // Finally
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

        const debugIntrospection = !true;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (debugIntrospection) {
          res.status(200).json(introspectionResult);
          return;
        }

        if (isITableArray(introspectionResult)) {
          const schemaInfo = convertIntrospectedStructure(introspectionResult);
          res.status(200).json(schemaInfo);
        }
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
