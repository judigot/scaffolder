import path from 'node:path';
import fs from 'node:fs';
import { mergeArrayOfObjects } from '@/utils/mergeArrayOfObjects.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';

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

interface IUserFilesResponse {
  files: IStructure;
}

export const createLocalFilesService = async (
  data: ICreateLocalFilesRequest,
): Promise<ICreateLocalFilesResponse> => {
  const { publicRepoURL, backendDir, schemaInfo } = data;

  try {
    // Get user files from the public repo
    const response = await fetch('http://localhost:5000/getUserFilesFromPublicRepo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicRepoURL }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repository files');
    }

    const responseData = (await response.json()) as IUserFilesResponse;
    const userFiles = responseData.files;

    // Build project files
    const projectFiles = buildProjectFiles('/Projects/Laravel.yaml', userFiles, schemaInfo);

    // Create target directory if it doesn't exist
    const targetDir = path.resolve(backendDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Create files in the target directory
    const createFolderStructure = (structure: IStructure, currentPath: string): void => {
      structure.forEach((item) => {
        const itemPath = path.join(currentPath, item.name);
        if (item.type === 'folder') {
          if (!fs.existsSync(itemPath)) {
            fs.mkdirSync(itemPath);
          }
          createFolderStructure(item.children, itemPath);
        } else {
          // Check if file exists and merge if necessary
          if (fs.existsSync(itemPath)) {
            const existingContent = fs.readFileSync(itemPath, 'utf-8');
            const mergedContent = mergeArrayOfObjects(existingContent, item.content, 'name');
            fs.writeFileSync(itemPath, JSON.stringify(mergedContent, null, 2));
          } else {
            fs.writeFileSync(itemPath, item.content);
          }
        }
      });
    };

    createFolderStructure(projectFiles, targetDir);

    return {
      success: true,
      message: `Successfully created files in ${String(targetDir)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

function getExistingStructure(targetDir: string): IStructure {
  const structure: IStructure = [];

  function readDirectory(dir: string, parentPath: string[] = []): void {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = [...parentPath, item];
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const folder: IStructure[number] = {
          name: item,
          type: 'folder',
          children: [],
        };
        structure.push(folder);
        readDirectory(fullPath, relativePath);
      } else {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const file: IStructure[number] = {
          name: item,
          type: 'file',
          content,
        };
        structure.push(file);
      }
    }
  }

  try {
    readDirectory(targetDir);
  } catch (error) {
    console.error('Error reading existing structure:', error);
  }

  return structure;
}

function createFolderStructure({
  structure,
  targetDirectory,
}: {
  structure: IStructure;
  targetDirectory: string;
}): void {
  for (const item of structure) {
    const itemPath = path.join(targetDirectory, item.name);

    if (item.type === 'folder') {
      if (!fs.existsSync(itemPath)) {
        fs.mkdirSync(itemPath, { recursive: true });
      }
      createFolderStructure({
        structure: item.children,
        targetDirectory: itemPath,
      });
    } else {
      fs.writeFileSync(itemPath, item.content);
    }
  }
} 