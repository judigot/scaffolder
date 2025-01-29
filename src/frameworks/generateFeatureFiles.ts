import fs from 'fs';
import path from 'path';

interface IMethod {
  methodName: string;
  route: string;
  description: string;
  repositoryMethod: string;
  repositoryContent: string;
  serviceMethod: string;
  serviceContent: string;
  controllerMethod: string;
  controllerContent: string;
}

const generateFeatureFiles = (methods: IMethod[], outputDir = 'base-methods') => {
  methods.forEach((method) => {
    const featureDir = path.join(outputDir, method.methodName);
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
  serviceContent: \`
      ${method.serviceContent}
    \`,
  controllerMethod: \`${method.controllerMethod}\`,
  controllerContent: \`
      ${method.controllerContent}
    \`,
} satisfies IMethod;
`;

    // Write the TypeScript file
    fs.writeFileSync(featureFile, fileContent, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`✅ Created: ${featureFile}`);
  });
};

export { generateFeatureFiles };
