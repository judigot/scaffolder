import { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively reads a directory and converts its structure to IStructure format
 * @param directoryPath - Path to the directory to read
 * @returns IStructure representation of the directory
 */
function convertLocalFilesToIStructure(directoryPath: string): IStructure {
  // If no directory is provided or it doesn't exist, return empty structure
  if (!directoryPath || !fs.existsSync(directoryPath)) {
    return [];
  }

  const result: IStructure = [];

  try {
    const items = fs.readdirSync(directoryPath);

    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        // It's a folder, recursively process its contents
        const folder: IFolder = {
          name: item,
          type: 'folder',
          children: convertLocalFilesToIStructure(itemPath),
        };
        result.push(folder);
      } else {
        // It's a file, read its content
        const content = fs.readFileSync(itemPath, 'utf-8');
        const file: IFile = {
          name: item,
          type: 'file',
          content,
        };
        result.push(file);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
  }

  return result;
}
// const laravelFolderStructure = convertLocalFilesToIStructure('src/files');

export default convertLocalFilesToIStructure;
