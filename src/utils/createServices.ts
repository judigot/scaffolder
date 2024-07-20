import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { IRelationshipInfo } from '@/interfaces/interfaces';

// Determine the current directory based on platform
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

// Function to get the owner comment
const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

// Function to create the service file content by replacing placeholders with actual values
const createServiceFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

// Function to create the services based on the provided relationships and framework
const createServices = (
  relationships: IRelationshipInfo[],
  framework: string,
  outputDir: string,
): void => {
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  relationships.forEach(({ table }) => {
    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/service.txt`,
    );

    // Check if the template file exists
    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const className = toPascalCase(table);
      const replacements = {
        ownerComment: getOwnerComment(),
        className,
        modelName: className,
        tableName: table,
      };

      const serviceContent = createServiceFile(template, replacements);
      const outputFilePath = path.join(outputDir, `${className}Service.php`);
      fs.writeFileSync(outputFilePath, serviceContent);
    } else {
      console.error(`Template not found: ${templatePath}`);
    }
  });
};

export default createServices;
