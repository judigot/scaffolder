import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileFsRef } from '@vercel/build-utils';
import { build } from '@vercel/hono';

const [directory] = process.argv.slice(2);
assert(
  directory,
  'Usage: node scripts/check-auth-vercel.mjs <generated monorepo>',
);
const repoRootPath = path.resolve(directory);
const workPath = path.join(repoRootPath, 'apps/api');
// This is the same second compilation performed by Vercel CLI 62.1.0.
// Dependencies and the ordinary build must already have passed. No deployment,
// credentials, project linking, or environment downloads are needed.
const result = await build({
  files: {
    'package.json': new FileFsRef({
      fsPath: path.join(workPath, 'package.json'),
    }),
  },
  entrypoint: 'package.json',
  workPath,
  repoRootPath,
  config: {
    projectSettings: {
      nodeVersion: '24.x',
      installCommand: '',
      buildCommand: 'true',
    },
  },
  meta: { isDev: true },
});
assert.equal(result.output.type, 'Lambda');
assert.equal(result.output.handler, 'src/app.js');
const vercelConfig = JSON.parse(
  fs.readFileSync(path.join(workPath, 'vercel.json'), 'utf8'),
);
assert.equal(vercelConfig.framework, 'hono');
assert.equal(
  vercelConfig.rewrites,
  undefined,
  'Native Hono must preserve request paths',
);
const { default: app, app: namedApp } = await import(
  pathToFileURL(path.join(workPath, 'src/app.ts')).href
);
assert.equal(
  app,
  namedApp,
  'Native and Node/Bun adapters must share the same app',
);
assert.equal(typeof app.fetch, 'function');
for (const route of ['/api/hello', '/api/health']) {
  const response = await app.fetch(new Request(`http://localhost${route}`));
  assert.equal(response.status, 200, route);
}
assert.equal(
  (await app.fetch(new Request('http://localhost/api/not-found'))).status,
  404,
);
console.log(
  'Native Vercel Hono compilation, default export, and API paths passed',
);
