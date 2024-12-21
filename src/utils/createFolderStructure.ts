import { IStructure } from '@/components/FileViewer.tsx';
import { watermark } from '@/constants.ts';
import fs from 'node:fs';
import path from 'node:path';

const clearGeneratedFiles = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    return;
  }

  fs.readdirSync(directory).forEach((file: string) => {
    const filePath = path.join(directory, file);
    const isFile = fs.lstatSync(filePath).isFile();

    if (isFile) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const hasWatermark = fileContent.includes(watermark);

      if (hasWatermark) {
        fs.unlinkSync(filePath);
      }
      return;
    }

    clearGeneratedFiles(filePath);

    const isDirectoryEmpty = fs.readdirSync(filePath).length === 0;
    if (isDirectoryEmpty) {
      fs.rmdirSync(filePath);
    }
  });
};

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
    }
    if (item.type === 'file') {
      const filePath = path.join(targetDirectory, item.name);

      const finalWatermark = `/* ${watermark} */`;
      let fileContent = item.content;
      const fileType = path.extname(item.name).slice(1);

      if (fileType === 'php') {
        fileContent = fileContent.replace('<?php', `<?php\n${finalWatermark}`); // Ensure the watermark is added immediately after the <?php tag
      } else {
        // For non-PHP files, prepend the watermark
        fileContent = `${finalWatermark}\n${fileContent}`;
      }

      fs.writeFileSync(filePath, fileContent, 'utf-8');
    }
  });
};

export default createFolderStructure;
