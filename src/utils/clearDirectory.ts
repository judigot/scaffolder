import fs from 'fs';
import path from 'path';
import { watermark } from '@/constants';

const clearGeneratedFiles = (directory: string): void => {
  if (!fs.existsSync(directory)) return;

  fs.readdirSync(directory).forEach((file) => {
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

export default clearGeneratedFiles;
