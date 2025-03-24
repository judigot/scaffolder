import path from 'node:path';
import fs from 'node:fs';
import { IStructure } from '@/components/FileViewer.tsx';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { createFolderStructure } from '@/utils/createFolderStructure.ts';

interface ICreateLocalFilesRequest {
  projectName: string;
  publicRepoURL: string;
  backendDir: string;
  schemaInfo: ISchemaInfo[];
}

interface ICreateLocalFilesResponse {
  success: boolean;
  message: string;
}

const isIStructure = (value: unknown): value is IStructure => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null)
  );
};

export const createLocalFilesService = async (
  data: ICreateLocalFilesRequest,
): Promise<ICreateLocalFilesResponse> => {
  const { publicRepoURL, backendDir, schemaInfo, projectName } = data;

  try {
    // Get user files from the public repo
    const response = await fetch(
      'http://localhost:5000/getUserFilesFromPublicRepo',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicRepoURL }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch repository files');
    }

    const userFiles: unknown = await response.json();

    if (!isIStructure(userFiles)) {
      throw new Error('Invalid user files');
    }

    // Build project files
    const projectFiles = buildProjectFiles(
      `/Projects/${projectName}`,
      userFiles,
      schemaInfo,
    );

    // Create target directory if it doesn't exist
    const targetDir = path.resolve(backendDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Use the utility function to create folder structure
    createFolderStructure({
      structure: projectFiles,
      targetDirectory: targetDir,
    });

    return {
      success: true,
      message: `Successfully created files in ${String(targetDir)}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};
