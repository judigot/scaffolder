import { IStructure } from '@/components/FileViewer';
import clearGeneratedFiles from '@/utils/clearDirectory';
import fs from 'fs';
import path from 'path';

/**
 * Recursively creates files and folders from the given structure after cleaning up old files.
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

      /* Clear old files before creating a new folder structure */
      if (fs.existsSync(folderPath)) {
        clearGeneratedFiles(folderPath);
      }

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
