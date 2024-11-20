import fs from 'fs';
import path from 'path';

interface ICreateOptions {
  interfaces: string | Record<string, string>;
  outputDir: string;
}

const createTypescriptInterfaces = ({
  interfaces,
  outputDir,
}: ICreateOptions): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  if (typeof interfaces === 'string') {
    const interfaceContent = interfaces;
    const outputFilePath = path.join(outputDir, 'interfaces.ts');
    fs.writeFileSync(outputFilePath, interfaceContent);
    return;
  } else if (typeof interfaces === 'object') {
    for (const [interfaceName, content] of Object.entries(interfaces)) {
      const interfaceContent = content;
      const outputFilePath = path.join(outputDir, `${interfaceName}.ts`);
      fs.writeFileSync(outputFilePath, interfaceContent);
    }
    return;
  }
};

export default createTypescriptInterfaces;
