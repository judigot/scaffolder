import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { download, FileFsRef, getIgnoreFilter } from '@vercel/build-utils';
import { build } from '@vercel/hono';

const [directory] = process.argv.slice(2);
assert(
  directory,
  'Usage: node scripts/check-auth-vercel.mjs <generated monorepo>',
);
const repoRootPath = path.resolve(directory);
const workPath = path.join(repoRootPath, 'apps/api');
// Vercel Git discovery evaluates project ignore rules against repository paths;
// a bare api/ also matches apps/api itself. Exercise the real filter in both layouts.
const gitIgnored = await getIgnoreFilter(repoRootPath, 'apps/api');
assert.equal(gitIgnored('apps/api/api/index.js'), true);
for (const file of [
  'apps/api/package.json',
  'apps/api/src/app.ts',
  'apps/api/src/auth/index.ts',
]) {
  assert.equal(gitIgnored(file), false, `Git deployment must retain ${file}`);
}
const cliIgnored = await getIgnoreFilter(workPath);
assert.equal(cliIgnored('api/index.js'), true);
assert.equal(cliIgnored('src/app.ts'), false);
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
assert.equal(result.output.handler, 'apps/api/src/app.js');
assert.deepEqual(result.routes, [
  { handle: 'filesystem' },
  {
    src: '/(.*)',
    dest: '/',
    transforms: [{ type: 'request.path', op: 'set', args: '/$1' }],
  },
]);
const vercelConfig = JSON.parse(
  fs.readFileSync(path.join(workPath, 'vercel.json'), 'utf8'),
);
assert.equal(vercelConfig.framework, 'hono');
assert(
  fs
    .readFileSync(path.join(workPath, '.vercelignore'), 'utf8')
    .split('\n')
    .includes('/apps/api/api/'),
  'Do not publish the legacy API directory alongside native Hono routing',
);
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
console.error(
  'Native Vercel Hono compilation, default export, and API paths passed',
);
const artifactDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'auth-vercel-artifact-'),
);
try {
  await download(result.output.files, artifactDirectory, {});
  const { default: emittedApp } = await import(
    pathToFileURL(path.join(artifactDirectory, result.output.handler)).href
  );
  for (const route of ['/api/hello', '/api/health']) {
    assert.equal(
      (await emittedApp.fetch(new Request(`http://localhost${route}`))).status,
      200,
      `Emitted Lambda ${route}`,
    );
  }
  console.error('Emitted native Lambda imports and fetch passed');
} finally {
  fs.rmSync(artifactDirectory, { recursive: true, force: true });
}
