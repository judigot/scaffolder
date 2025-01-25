import { DBTypes, IJSONSchema, ISchemaInfo } from '@/interfaces/interfaces.ts';
import path from 'node:path';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import createFolderStructure from '@/utils/createFolderStructure.ts';
import { useFolderStructures } from '@/frameworks/useFolderStructures.ts';
import { mergeArrayOfObjects } from '@/utils/mergeArrayOfObjects.ts';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import { IncomingMessage } from 'node:http';
import { changeCase } from '@/utils/common.ts';

interface IScaffoldRequest {
  schema: IJSONSchema;
  dbType: DBTypes;
  schemaInfo: ISchemaInfo[];
  framework: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  SQLSchema: string | null;
  backendUrl: string;
}

interface IScaffoldResponse {
  isBackendUrlValid: boolean;
  isBackendDirValid: boolean;
  isFrontendDirValid: boolean;
  isDBConnectionValid: boolean;
}

export const scaffoldService = async (
  data: IScaffoldRequest,
): Promise<IScaffoldResponse> => {
  const {
    schemaInfo,
    framework,
    backendDir,
    frontendDir,
    dbConnection,
    SQLSchema,
    backendUrl,
  } = data;

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const backendDirPath = path.resolve(__dirname, backendDir);
  const frontendDirPath = path.resolve(__dirname, frontendDir);

  let isDBConnectionValid = false;
  const isBackendDirValid = backendDir !== '' && fs.existsSync(backendDirPath);
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const folderStructures = useFolderStructures(schemaInfo);

    if (
      isBackendDirValid &&
      isFrontendDirValid &&
      backendDirPath === frontendDirPath
    ) {
      const combinedFolderStructure = mergeArrayOfObjects(
        folderStructures[framework],
        folderStructures.frontend,
        'name',
      );
      createFolderStructure({
        structure: combinedFolderStructure,
        targetDirectory: backendDirPath,
      });
    } else {
      createFolderStructure({
        structure: folderStructures[framework],
        targetDirectory: isBackendDirValid
          ? backendDirPath
          : path.resolve(__dirname, `../output/backend`),
      });

      createFolderStructure({
        structure: folderStructures.frontend,
        targetDirectory: isFrontendDirValid
          ? frontendDirPath
          : path.resolve(__dirname, `../output/frontend`),
      });
    }

    const isBackendUrlValid = await checkBackendUrlValidity(
      backendUrl,
      schemaInfo,
    );

    return {
      isBackendUrlValid,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
    };
  } catch (error) {
    console.error('Error generating models:', error);
    return {
      isBackendUrlValid: false,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
    };
  }
};

function checkBackendUrlValidity(
  backendUrl: string,
  schemaInfo: ISchemaInfo[],
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(backendUrl);
      const request = parsedUrl.protocol === 'https:' ? https.get : http.get;

      request(
        `${backendUrl}/${changeCase(schemaInfo[0].tableName).snakeCasePlural}`,
        (res: IncomingMessage) => {
          if (
            res.statusCode != null &&
            res.statusCode >= 200 &&
            res.statusCode < 300
          ) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
      ).on('error', () => {
        resolve(false);
      });
    } catch (error) {
      console.error('Error checking backend URL:', error);
      resolve(false);
    }
  });
}
