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

  // Resolve backendDir - if it's already absolute, use it as-is; otherwise resolve from current working directory
  const backendDirPath = path.isAbsolute(backendDir)
    ? backendDir
    : path.resolve(process.cwd(), backendDir);

  let isDBConnectionValid = false;
  let isBackendUrlValid = false;
  let errorMessage: string | null = null;
  let errorLine: number | null = null;
  let errorPosition: number | null = null;
  const isBackendDirValid = backendDir !== '' && fs.existsSync(backendDirPath);
  const isFrontendDirValid = true; // Not used in project builder, but kept for response compatibility

  // Extract projectName and projectPath from formData or use default
  // Use the same logic as preview: use uniqueId if available, otherwise use folder-based path
  let projectName = 'my-app';
  let projectPath = '/Projects/my-app/structure.yaml';

  if (
    typeof formData.projectName === 'string' &&
    formData.projectName.trim() !== ''
  ) {
    projectName = formData.projectName;
    projectPath = `/Projects/${projectName}/structure.yaml`;
  } else if (selectedProject !== null && selectedProject !== undefined) {
    if (
      typeof selectedProject === 'object' &&
      'name' in selectedProject &&
      typeof selectedProject.name === 'string' &&
      selectedProject.name.trim() !== ''
    ) {
      projectName = selectedProject.name;
      // Use uniqueId if available (same as preview), otherwise use folder-based path
      if (
        'uniqueId' in selectedProject &&
        typeof selectedProject.uniqueId === 'string' &&
        selectedProject.uniqueId.trim() !== ''
      ) {
        projectPath = selectedProject.uniqueId;
      } else {
        projectPath = `/Projects/${projectName}/structure.yaml`;
      }
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
        errorLine = dbResult.errorLine ?? null;
        errorPosition = dbResult.errorPosition ?? null;
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
    // Use projectPath which respects uniqueId if available (same as preview)
    const buildResult = await buildProjectFiles(
      projectPath,
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
    try {
      createFolderStructure({
        structure: buildResult.structure,
        targetDirectory: backendDirPath,
      });
    } catch (fileError) {
      const fileErrorMessage =
        fileError instanceof Error ? fileError.message : 'Unknown file error';
      console.error('Error creating folder structure:', fileError);
      throw new Error(
        `Failed to create files in ${backendDirPath}: ${fileErrorMessage}`,
      );
    }

    // Set backend URL status only after the files are created
    isBackendUrlValid = await checkBackendUrlValidity(backendUrl, schemaInfo);

    return {
      isBackendUrlValid,
      isBackendDirValid,
      isFrontendDirValid,
      isDBConnectionValid,
      errorMessage,
      errorLine,
      errorPosition,
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
      errorLine: errorLine ?? null,
      errorPosition: errorPosition ?? null,
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
