import * as fs from 'fs';
import * as path from 'path';
import { isBinaryFile } from '../utils/binaryFileUtils';
/**
 * Recursively reads a directory and converts its structure to IStructure format
 * @param directoryPath - Path to the directory to read
 * @returns IStructure representation of the directory
 */
function convertLocalFilesToIStructure(directoryPath) {
  // If no directory is provided or it doesn't exist, return empty structure
  if (!directoryPath || !fs.existsSync(directoryPath)) {
    return [];
  }
  const result = [];
  try {
    const items = fs.readdirSync(directoryPath);
    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        // It's a folder, recursively process its contents
        const folder = {
          name: item,
          type: 'folder',
          children: convertLocalFilesToIStructure(itemPath),
        };
        result.push(folder);
      } else {
        const binary = isBinaryFile(item);
        const content = binary
          ? fs.readFileSync(itemPath).toString('base64')
          : fs.readFileSync(itemPath, 'utf-8');
        const file = {
          name: item,
          type: 'file',
          content,
          isBinary: binary,
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
