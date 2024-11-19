import fs from 'fs';
import path from 'path';
import { ownerComment } from '@/constants';
import { createFile } from '@/helpers/stringHelper';

// Global variables
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

// Define a type for file types
type FileType = 'controller' | 'repository' | 'repositoryInterface';

const createBaseFile = (
  framework: string,
  outputDir: string,
  fileType: FileType,
): void => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const replacements = { ownerComment };

  // Mapping file types to template and output names
  const fileConfig: Record<FileType, { template: string; output: string }> = {
    controller: {
      template: 'base-controller.txt',
      output: 'BaseController.php',
    },
    repository: {
      template: 'base-repository.txt',
      output: 'BaseRepository.php',
    },
    repositoryInterface: {
      template: 'base-repository-interface.txt',
      output: 'BaseInterface.php',
    },
  };

  const { template, output } = fileConfig[fileType];

  // Create Base File
  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/${template}`,
  );

  if (fs.existsSync(templatePath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    const content = createFile({ template, replacements });
    const outputFilePath = path.join(outputDir, output);
    fs.writeFileSync(outputFilePath, content, 'utf-8');
  } else {
    console.error(`Template not found: ${templatePath}`);
  }
};

export default createBaseFile;
