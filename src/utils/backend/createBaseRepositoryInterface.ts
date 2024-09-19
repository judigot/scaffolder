import fs from 'fs';
import path from 'path';

// Global variables
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

const createFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const createBaseRepository = (framework: string, outputDir: string): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const replacements = {
    ownerComment: getOwnerComment(),
  };

  // Create Base Repository
  const baseRepoTemplatePath = path.resolve(
    __dirname,
    `../../templates/backend/${framework}/base-repository-interface.txt`,
  );
  if (fs.existsSync(baseRepoTemplatePath)) {
    const baseRepoTemplate = fs.readFileSync(baseRepoTemplatePath, 'utf-8');
    const baseRepoContent = createFile(baseRepoTemplate, replacements);
    const baseRepoOutputFilePath = path.join(outputDir, `BaseInterface.php`);
    fs.writeFileSync(baseRepoOutputFilePath, baseRepoContent);
  } else {
    console.error(`Template not found: ${baseRepoTemplatePath}`);
  }
};

export default createBaseRepository;
