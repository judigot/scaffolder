import fs from 'fs';
import path from 'path';

const clearDirectory = (directory: string): void => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        clearDirectory(filePath);
        fs.rmdirSync(filePath);
      }
    });
  }
};

export default clearDirectory;
