import { methods } from '@/frameworks/backend/laravel/base-methods/index.ts';
import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
import { changeCase } from '@/utils/common.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert `import.meta.url` to a file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'base-methods'); // Ensures files are created in the same directory

if (fs.existsSync(outputDir)) {
  fs.rmdirSync(outputDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`✅ Deleted: ${outputDir}`);
}

// Generate index.ts for a specific group directory
const generateGroupIndexFile = (groupDir: string, methods: string[]) => {
  const imports = methods
    .map((method) => `import ${method} from './${method}/laravel.ts';`)
    .join('\n');

  const exports = `export default {
${methods.map((method) => `  ...${method},`).join('\n')}
} satisfies IMethod;`;

  const indexContent = `import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
${imports}\n\n${exports}\n`;
  const indexPath = path.join(groupDir, 'index.ts');
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✅ Created: ${indexPath}`);
};

const generateFeatureFiles = (operation: IRepositoryStructure[]) => {
  // Track methods by group for generating group index files
  const methodsByGroup = new Map<string, string[]>();

  operation.forEach(({ group, methods }) => {
    const groupDirName = changeCase(group).kebabCase;
    const groupDir = path.join(outputDir, groupDirName);

    // Initialize group methods array if not exists
    if (!methodsByGroup.has(groupDirName)) {
      methodsByGroup.set(groupDirName, []);
    }

    methods.forEach((method) => {
      const featureDir = path.join(groupDir, method.methodName);
      const featureFile = path.join(featureDir, 'laravel.ts');

      // Ensure the feature directory exists
      if (!fs.existsSync(featureDir)) {
        fs.mkdirSync(featureDir, { recursive: true });
      }

      // Track method for group index
      methodsByGroup.get(groupDirName)?.push(method.methodName);

      // Write the TypeScript file
      fs.writeFileSync(
        featureFile,
        `import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

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
`,
        'utf8',
      );
      // eslint-disable-next-line no-console
      console.log(`✅ Created: ${featureFile}`);
    });
  });

  // Generate index.ts for each group
  methodsByGroup.forEach((methods, groupDirName) => {
    const groupDir = path.join(outputDir, groupDirName);
    generateGroupIndexFile(groupDir, methods);
  });

  // Generate main index.ts
  generateIndexFile(outputDir, methodsByGroup);
};

// Generate `index.ts` that dynamically imports all `laravel.ts` files
const generateIndexFile = (
  outputDir: string,
  methodsByGroup: Map<string, string[]>,
) => {
  const featureDirs = Array.from(methodsByGroup.keys());

  // Generate imports for each group
  const imports = featureDirs
    .map(
      (feature) =>
        `import ${changeCase(feature).pascalCase} from './${feature}/index.ts';`,
    )
    .join('\n');

  // Generate the base methods array
  const indexContent = `import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
${imports}

const baseMethods: IRepositoryStructure[] = [
${featureDirs
  .map((feature) => {
    const groupName = feature
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `  { group: '${changeCase(groupName).titleCase}', methods: [${changeCase(feature).pascalCase}] }`;
  })
  .join(',\n')}
];

export default baseMethods;
`;

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✅ Created: ${path.join(outputDir, 'index.ts')}`);
};

// Run the generator
generateFeatureFiles(methods);
