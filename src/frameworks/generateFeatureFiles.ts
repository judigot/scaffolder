import { methods } from '@/frameworks/backend/laravel/base-methods/index.ts';
import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
import { changeCase } from '@/utils/common.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert `import.meta.url` to a file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateFeatureFiles = (operation: IRepositoryStructure[]) => {
  const outputDir = path.join(__dirname, 'base-methods'); // Ensures files are created in the same directory

  operation.forEach(({ group, methods }) => {
    methods.map((method) => {
      const groupDir = path.join(outputDir, changeCase(group).kebabCase);
      const featureDir = path.join(groupDir, method.methodName);
      const featureFile = path.join(featureDir, 'laravel.ts');

      // Ensure the feature directory exists
      if (!fs.existsSync(featureDir)) {
        fs.mkdirSync(featureDir, { recursive: true });
      }

      // Define the TypeScript content
      const fileContent = `import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: '${method.methodName}',
  route: \`${method.route}\`,
  description: '${method.description}',
  repositoryMethod: \`${method.repositoryMethod}\`,
  repositoryContent: \`${method.repositoryContent}\`,
  serviceMethod: \`${method.serviceMethod}\`,
  serviceContent: \`${method.serviceContent}\`,
  controllerMethod: \`${method.controllerMethod}\`,
  controllerContent: \`${method.controllerContent}\`,
} satisfies IMethod;
`;

      // Write the TypeScript file
      fs.writeFileSync(featureFile, fileContent, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`✅ Created: ${featureFile}`);
    });
  });

  // Generate index.ts
  generateIndexFile(outputDir);
};

// Generate `index.ts` that dynamically imports all `laravel.ts` files
const generateIndexFile = (outputDir: string) => {
  const featureDirs = fs
    .readdirSync(outputDir)
    .filter((dir) => fs.statSync(path.join(outputDir, dir)).isDirectory());

  // Generate static imports for each Laravel method
  const imports = featureDirs
    .map((feature) => `import ${feature} from './${feature}/laravel.ts';`)
    .join('\n');

  // Generate the exported object with hardcoded Laravel imports
  const indexContent = `${imports}

export const loadFeatureMethods = (frameworkName: string) => {
  if (frameworkName !== 'laravel') {
    throw new Error(\`Framework "\${frameworkName}" is not statically imported\`);
  }

  return {
    laravel: {
${featureDirs.map((feature) => `      ${feature},`).join('\n')}
    },
  };
};
`;

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✅ Created: ${path.join(outputDir, 'index.ts')}`);
};

export { generateIndexFile };

// Run the generator
generateFeatureFiles(methods);

export { generateFeatureFiles };
