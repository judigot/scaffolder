import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from "node:fs";
import dotenv from 'dotenv';
import { ISchemaInfo, isITableArray } from '@/interfaces/interfaces.ts';
import introspect from '@/utils/introspect.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure.ts';
import http from 'node:http';
import https from 'node:https';
import createFolderStructure from '@/utils/createFolderStructure.ts';
import { useFolderStructures } from '@/frameworks/useFolderStructures.ts';
import { mergeArrayOfObjects } from '@/utils/mergeArrayOfObjects.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import process from "node:process";

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

// Define routes
app.get('/', (_req, res) => {
  const isDevelopment: boolean = String(process.env.NODE_ENV) === 'development';

  if (isDevelopment) {
    res.redirect(String(process.env.VITE_FRONTEND_URL));
    return;
  }

  res.sendFile(publicDirectory);
});

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
  '/scaffold',
  (
    req: Request<
      unknown,
      unknown,
      {
        schemaInfo: ISchemaInfo[];
        framework: string;
        backendDir: string;
        frontendDir: string;
        dbConnection: string;
        SQLSchema: string | null;
        backendUrl: string;
      }
    >,
    res: Response,
  ) => {
    const {
      schemaInfo,
      framework,
      backendDir,
      frontendDir,
      dbConnection,
      SQLSchema,
      backendUrl,
    } = req.body;

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
      const isBackendDirValid =
        backendDir !== '' && fs.existsSync(backendDirPath);
      const isFrontendDirValid =
        frontendDir !== '' && fs.existsSync(frontendDirPath);

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
        if (
          isBackendDirValid &&
          isFrontendDirValid &&
          backendDirPath === frontendDirPath
        ) {
          const combinedFolderStructure = mergeArrayOfObjects(
            useFolderStructures(schemaInfo)[framework],
            useFolderStructures(schemaInfo).frontend,
            'name',
          );
          createFolderStructure({
            structure: combinedFolderStructure,
            targetDirectory: backendDirPath,
          });
        } else {
          createFolderStructure({
            structure: useFolderStructures(schemaInfo)[framework],
            targetDirectory: isBackendDirValid
              ? backendDirPath
              : path.resolve(__dirname, `../output/backend`),
          });

          createFolderStructure({
            structure: useFolderStructures(schemaInfo).frontend,
            targetDirectory: isFrontendDirValid
              ? frontendDirPath
              : path.resolve(__dirname, `../output/frontend`),
          });
        }

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
  async (
    req: Request<unknown, unknown, { dbConnection: string }>,
    res: Response,
  ): Promise<void> => {
    const { dbConnection } = req.body;
    if (!dbConnection) {
      res.status(400).json({ error: 'Database connection string is required' });
      return;
    }

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
  },
);

// Start server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on http://localhost:${PORT}`,
  );
});
