import { IStructure } from '@/components/FileViewer';
import fs from 'fs';
import path from 'path';

/**
 * Recursively creates files and folders from the given structure.
 *
 * @param params - The parameters object containing structure and targetDirectory.
 */
export const createFolderStructure = ({
  structure,
  targetDirectory,
}: {
  structure: IStructure;
  targetDirectory: string;
}): void => {
  structure.forEach((item) => {
    if (item.type === 'folder') {
      const folderPath = path.join(targetDirectory, item.name);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      createFolderStructure({
        structure: item.files,
        targetDirectory: folderPath,
      });
    } else {
      const filePath = path.join(targetDirectory, item.name);

      fs.writeFileSync(filePath, item.content, 'utf-8');
    }
  });
};

export default createFolderStructure;
