import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import path from 'node:path';
import createFolderStructure from '@/utils/createFolderStructure.ts';
import { useFolderStructures } from '@/frameworks/useFolderStructures.ts';
import { mergeArrayOfObjects } from '@/utils/mergeArrayOfObjects.ts';
import https from 'node:https';
import http, { IncomingMessage } from 'node:http';
import fs from 'node:fs';
import { changeCase } from '@/utils/common.ts';
import { IFormStore } from '@/useFormStore.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { createOrResetDatabase } from '@/utils/databaseOperations.ts';

interface IScaffoldRequest {
  formData: IFormStore;
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
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
  const { schemaInfo, SQLSchema, formData } = data;

  const { framework, backendDir, frontendDir, dbConnection, backendUrl } =
    formData;

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const backendDirPath = path.resolve(__dirname, backendDir);
  const frontendDirPath = path.resolve(__dirname, frontendDir);

  let isDBConnectionValid = false;

  let isBackendUrlValid = false;

  const isBackendDirValid = backendDir !== '' && fs.existsSync(backendDirPath);

  const isFrontendDirValid =
    frontendDir !== '' && fs.existsSync(frontendDirPath);

  if (SQLSchema !== null) {
    try {
      // Extract database connection info to create database info object
      const { username, password, host, port, dbName, dbType } =
        extractDBConnectionInfo(dbConnection);

      // Create database info object
      const databaseInfo = {
        name: dbName,
        user: username,
        password,
        host,
        port: String(port),
        type: dbType,
      };

      // Use the utility function to reset the database
      const dbResult = await createOrResetDatabase(databaseInfo, SQLSchema);
      isDBConnectionValid = dbResult.success;

      if (!dbResult.success) {
        console.error('Error executing database command:', dbResult.message);
      }
    } catch (error: unknown) {
      console.error('Error executing database command:', error);
    }
  } else {
    isDBConnectionValid = true;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const folderStructures = useFolderStructures({ schemaInfo, formData });

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

    // Set backend URL status only after the files are created
    isBackendUrlValid = await checkBackendUrlValidity(backendUrl, schemaInfo);

    return {
      isBackendUrlValid,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
    };
  } catch (error) {
    console.error('Error generating models:', error);
    return {
      isBackendUrlValid,
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
