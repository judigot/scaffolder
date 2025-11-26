import fs from 'node:fs';
import path from 'node:path';
/**
 * Recursively creates files and folders from the given structure.
 */
export const createFolderStructure = ({ structure, targetDirectory }) => {
  structure.forEach((item) => {
    if (item.type === 'folder') {
      const folderPath = path.join(targetDirectory, item.name);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      createFolderStructure({
        structure: item.children,
        targetDirectory: folderPath,
      });
    }
    if (item.type === 'file') {
      const filePath = path.join(targetDirectory, item.name);
      if (item.isBinary === true) {
        const binaryData = Buffer.from(item.content, 'base64');
        fs.writeFileSync(filePath, binaryData);
        return;
      }
      fs.writeFileSync(filePath, item.content, 'utf-8');
    }
  });
};
export default createFolderStructure;
