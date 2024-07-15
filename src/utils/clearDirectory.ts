import fs from 'fs';
import path from 'path';

const specialText = 'Owner: App Scaffolder';

const clearGeneratedFiles = (directory: string): void => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isFile()) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        if (fileContent.includes(specialText)) {
          fs.unlinkSync(filePath);
        }
      } else {
        clearGeneratedFiles(filePath);
        // Remove the directory if it becomes empty
        if (fs.readdirSync(filePath).length === 0) {
          fs.rmdirSync(filePath);
        }
      }
    });
  }
};

export default clearGeneratedFiles;
