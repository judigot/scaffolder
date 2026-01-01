import path from 'node:path';
import createFolderStructure from '@/utils/createFolderStructure.ts';
import https from 'node:https';
import http, { type IncomingMessage } from 'node:http';
import fs from 'node:fs';
import { changeCase } from '@/utils/common.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { extractDBConnectionInfo } from '@/utils/extractDBConnectionInfo.ts';
import { createOrResetDatabase } from '@/utils/databaseOperations.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { isUsingLocalFiles } from '@/hooks/useUserFiles.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import type { IProjectGenerationRequest } from '@/interfaces/IProjectGenerationRequest.ts';
import type { IGenerationStatus } from '@/interfaces/IGenerationStatus.ts';

const isIStructure = (value: unknown): value is IStructure => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null)
  );
};

export const scaffoldService = async (
  data: IProjectGenerationRequest,
): Promise<IGenerationStatus> => {
  const { schemaInfo, SQLSchema, formData, userMetadata } = data;

  const {
    publicRepoURL,
    backendDir,
    backendUrl,
    dbConnection,
    selectedProject,
  } = formData;

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const backendDirPath = path.resolve(__dirname, backendDir);

  let isDBConnectionValid = false;
  let isBackendUrlValid = false;
  let errorMessage: string | null = null;
  const isBackendDirValid = backendDir !== '' && fs.existsSync(backendDirPath);
  const isFrontendDirValid = true; // Not used in project builder, but kept for response compatibility

  // Extract projectName from formData or use default
  let projectName = 'my-app';

  if (
    typeof formData.projectName === 'string' &&
    formData.projectName.trim() !== ''
  ) {
    projectName = formData.projectName;
  } else if (selectedProject !== null && selectedProject !== undefined) {
    if (
      typeof selectedProject === 'object' &&
      'name' in selectedProject &&
      typeof selectedProject.name === 'string' &&
      selectedProject.name.trim() !== ''
    ) {
      projectName = selectedProject.name;
    }
  }

  // Execute database operations first
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
        errorMessage = `Database operation failed: ${dbResult.message}`;
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown database error';
      console.error('Error executing database command:', error);
      errorMessage = `Database operation error: ${errorMsg}`;
      isDBConnectionValid = false;
    }
  } else {
    isDBConnectionValid = true;
  }

  try {
    // Fetch user files from the public repo (same as createLocalFilesService)
    const response = await fetch(
      isUsingLocalFiles
        ? `${getApiUrl()}/getUserFiles`
        : `${getApiUrl()}/getUserFilesFromPublicRepo`,
      {
        method: isUsingLocalFiles ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isUsingLocalFiles
          ? undefined
          : JSON.stringify({
              publicRepoURL,
              selectedProject:
                selectedProject !== null &&
                selectedProject !== undefined &&
                typeof selectedProject === 'object' &&
                'name' in selectedProject &&
                typeof selectedProject.name === 'string'
                  ? { name: selectedProject.name }
                  : undefined,
            }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch repository files');
    }

    const userFiles: unknown = await response.json();

    if (!isIStructure(userFiles)) {
      throw new Error('Invalid user files');
    }

    // Build project files using the project builder (same as createLocalFilesService)
    const buildResult = await buildProjectFiles(
      `/Projects/${projectName}/structure.yaml`,
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Create target directory if it doesn't exist
    if (!fs.existsSync(backendDirPath)) {
      fs.mkdirSync(backendDirPath, { recursive: true });
    }

    // Use the utility function to create folder structure
    createFolderStructure({
      structure: buildResult.structure,
      targetDirectory: backendDirPath,
    });

    // Set backend URL status only after the files are created
    isBackendUrlValid = await checkBackendUrlValidity(backendUrl, schemaInfo);

    return {
      isBackendUrlValid,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
      errorMessage,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating models:', error);
    return {
      isBackendUrlValid,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
      errorMessage: errorMessage ?? `Project generation failed: ${errorMsg}`,
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
