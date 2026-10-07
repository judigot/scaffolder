import fs from 'node:fs';
import path from 'node:path';
import { generateAuthFoundation } from '../src/tests/helpers/authFoundation.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import { createFolderStructure } from '../src/utils/createFolderStructure.ts';

const [baseDirectory, outputDirectory] = process.argv.slice(2);
if (baseDirectory === undefined || outputDirectory === undefined) {
  throw new Error(
    'Usage: bun scripts/generate-auth-foundation.ts <clean starter archive directory> <new output directory>',
  );
}
const targetDirectory = path.resolve(outputDirectory);
if (fs.existsSync(targetDirectory)) {
  throw new Error(
    'Output must be a new directory; existing scaffolds are never patched',
  );
}
if (
  fs.existsSync(path.join(baseDirectory, '.git')) ||
  fs.existsSync(path.join(baseDirectory, 'node_modules'))
) {
  throw new Error(
    'Use a clean git archive, not a working checkout with metadata/dependencies',
  );
}
const result = await generateAuthFoundation(
  convertLocalFilesToIStructure(baseDirectory),
);
if (result.hasErrors === true || result.filesFailedToFormat.length > 0) {
  throw new Error(JSON.stringify(result.messages));
}
createFolderStructure({ structure: result.structure, targetDirectory });
console.error(`Generated authentication foundation at ${targetDirectory}`);
process.exit(0);
