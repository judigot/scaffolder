import fs from 'fs';
import path from 'path';

const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

const createTypescriptInterfaces = (interfaces: string, outputDir: string): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const interfaceContent = `${getOwnerComment()}${interfaces}`;
  const outputFilePath = path.join(outputDir, 'interfaces.ts');
  fs.writeFileSync(outputFilePath, interfaceContent);
};

export default createTypescriptInterfaces;
