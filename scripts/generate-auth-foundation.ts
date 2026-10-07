import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  generateAuthFoundation,
  authFoundationSchema,
  validateLocalAuthFoundationRequest,
} from '../src/tests/helpers/authFoundation.ts';
import {
  addScaffoldMetadata,
  createScaffoldMetadata,
  scaffoldManifestToRequest,
} from '../src/utils/scaffoldMetadata.ts';
import { parseRecipeDirectives } from '../src/utils/project-builder/utils/recipeDirectives.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import { createFolderStructure } from '../src/utils/createFolderStructure.ts';

const [baseDirectory, outputDirectory, manifestPath] = process.argv.slice(2);
if (baseDirectory === undefined || outputDirectory === undefined) {
  throw new Error(
    'Usage: bun scripts/generate-auth-foundation.ts <clean starter archive directory> <new output directory> [manifest.json]',
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
const request =
  manifestPath === undefined
    ? {
        project: 'hono-react-monorepo',
        output: 'zip' as const,
        schemaInfo: authFoundationSchema,
      }
    : scaffoldManifestToRequest(
        JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
      );
validateLocalAuthFoundationRequest(request);
const result = await generateAuthFoundation(
  convertLocalFilesToIStructure(baseDirectory),
  request.schemaInfo,
);
if (result.hasErrors === true || result.filesFailedToFormat.length > 0) {
  throw new Error(JSON.stringify(result.messages));
}
const generatorSha =
  execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
  }).trim() === ''
    ? execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim()
    : undefined;
const recipe = parseRecipeDirectives(
  fs.readFileSync('files/Projects/hono-react-monorepo/structure.yaml', 'utf8'),
);
const metadata = createScaffoldMetadata(request, {
  generatorSha,
  recipeSha: generatorSha,
  delivery: 'local-directory',
  templateSource: request.template_repo ?? recipe.base ?? undefined,
});
metadata.context.regeneration.push(
  'Local starter archive and recipe files must be verified against the recorded source revisions before replay. This runner does not fetch or prove archive provenance.',
);
createFolderStructure({
  structure: addScaffoldMetadata(result.structure, metadata),
  targetDirectory,
});
console.error(`Generated authentication foundation at ${targetDirectory}`);
process.exit(0);
