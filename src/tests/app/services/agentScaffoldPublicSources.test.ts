import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';
import { scaffoldToPullRequest } from '@/app/services/agentScaffoldService.ts';
import { createAgentTargetRepository } from '@/app/services/agentCreateRepoService.ts';
import { createTarGz } from '@/tests/helpers/createTarGz.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const sha = 'a'.repeat(40);
const schemaInfo = [
  {
    tableName: 'users',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'number',
        is_nullable: 'NO',
        primary_key: true,
      },
    ],
  },
];

describe('public sources and PAT end to end', () => {
  it.each(['User', 'Organization'])(
    'resolves URLs, merges a tar fixture and publishes using the PAT (%s)',
    async (ownerType) => {
      const sourceRequests: string[] = [];
      const recipe = createTarGz([
        {
          path: 'files/Projects/demo/structure.yaml',
          content:
            '$BASE: https://github.com/anyone/starter\nreplace:\n  - apps/api/**\n$USE_CORE:\n  - /Core/nestjs-api\n',
        },
        {
          path: 'files/Core/nestjs-api/apps/api/main.ts',
          content: 'export const framework = "nestjs";\n',
        },
      ]);
      const starter = createTarGz([
        {
          path: 'starter/package.json',
          content:
            '{"name":"starter","dependencies":{"hono":"4","react":"19"}}',
        },
        {
          path: 'starter/apps/api/index.ts',
          content: 'import { Hono } from "hono";\n',
        },
        { path: 'starter/README.md', content: '# public starter\n' },
      ]);
      const sourceFetch: typeof fetch = (input, init) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        sourceRequests.push(url);
        expect(new Headers(init?.headers).has('authorization')).toBe(false);
        if (url.includes('codeload.github.com')) {
          expect(url.endsWith(`/tar.gz/${sha}`)).toBe(true);
          return Promise.resolve(
            new Response(
              Buffer.from(url.includes('/recipes/') ? recipe : starter),
            ),
          );
        }
        return Promise.resolve(
          Response.json(
            url.includes('/commits/')
              ? { sha }
              : { private: false, default_branch: 'release' },
          ),
        );
      };
      globalThis.fetch = sourceFetch;

      let repoCreated = false;
      const writes: { path: string; body: unknown }[] = [];
      const githubFetch: typeof fetch = (input, init) => {
        expect(new Headers(init?.headers).get('authorization')).toBe(
          'token test-pat',
        );
        const path = new URL(
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        ).pathname;
        if (init?.method === 'POST') {
          const body: unknown = JSON.parse(
            typeof init.body === 'string' ? init.body : '{}',
          );
          writes.push({ path, body });
          if (path === '/user/repos' || path === '/orgs/alice/repos') {
            repoCreated = true;
            return Promise.resolve(
              Response.json(
                { html_url: 'https://github.com/alice/new-app' },
                { status: 201 },
              ),
            );
          }
          if (path.endsWith('/pulls')) {
            return Promise.resolve(
              Response.json(
                {
                  number: 1,
                  html_url: 'https://github.com/alice/new-app/pull/1',
                },
                { status: 201 },
              ),
            );
          }
          return Promise.resolve(
            Response.json({ sha: 'generated' }, { status: 201 }),
          );
        }
        if (path === '/user') {
          return Promise.resolve(Response.json({ login: 'alice' }));
        }
        if (path === '/users/alice') {
          return Promise.resolve(Response.json({ type: ownerType }));
        }
        if (path === '/repos/alice/new-app') {
          return Promise.resolve(
            repoCreated
              ? Response.json({ default_branch: 'trunk' })
              : Response.json({}, { status: 404 }),
          );
        }
        if (path.includes('/git/ref/')) {
          return Promise.resolve(Response.json({ object: { sha: 'base' } }));
        }
        if (path.includes('/git/commits/')) {
          return Promise.resolve(Response.json({ tree: { sha: 'base-tree' } }));
        }
        if (path.endsWith('/pulls')) {
          return Promise.resolve(Response.json([]));
        }
        throw new Error(`Unexpected GitHub request: ${path}`);
      };
      const result = await scaffoldToPullRequest(
        {
          schemaInfo,
          project_url:
            'https://github.com/alice/recipes/tree/release/Projects/demo',
          target_repo: 'https://github.com/alice/new-app',
          create_repo: true,
        },
        {
          githubToken: 'test-pat',
          createTokenClient: (token) =>
            new Octokit({ auth: token, request: { fetch: githubFetch } }),
          randomId: () => 'fixture',
        },
      );
      expect(result).toMatchObject({
        repoCreated: true,
        resolvedSha: sha,
        projectResolvedSha: sha,
        prNumber: 1,
        baseBranch: 'trunk',
      });
      expect(sourceRequests).toHaveLength(6);
      expect(writes[0]?.path).toBe(
        ownerType === 'User' ? '/user/repos' : '/orgs/alice/repos',
      );
      expect(writes[0]?.body).toMatchObject({ private: true, auto_init: true });
      const tree = writes.find((write) => write.path.endsWith('/git/trees'));
      expect(JSON.stringify(tree?.body)).toContain('apps/api/main.ts');
      expect(JSON.stringify(tree?.body)).toContain('README.md');
      expect(JSON.stringify(tree?.body)).toContain('package.json');
      expect(JSON.stringify(tree?.body)).not.toContain('apps/api/index.ts');
      const blobs = writes.filter((write) => write.path.endsWith('/git/blobs'));
      const contents = blobs
        .map((blob) =>
          Buffer.from(
            z.object({ content: z.string() }).parse(blob.body).content,
            'base64',
          ).toString('utf8'),
        )
        .join('\n');
      expect(contents).not.toContain('hono');
      expect(contents).toContain('react');
    },
  );

  it('does not fall back to App or stored credentials when a PAT fails', async () => {
    const fallback = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: 'Bad credentials' }, { status: 401 }),
      );
    await expect(
      createAgentTargetRepository(
        { owner: 'alice', repo: 'new' },
        { githubToken: 'bad' },
        {
          createTokenClient: () =>
            new Octokit({
              request: { fetch: fetchImpl },
              log: {
                debug: () => {
                  /* Silence mocked SDK failures. */
                },
                info: () => {
                  /* Silence mocked SDK failures. */
                },
                warn: () => {
                  /* Silence mocked SDK failures. */
                },
                error: () => {
                  /* Silence mocked SDK failures. */
                },
              },
            }),
          getStoredUserToken: fallback,
          createRepository: fallback,
          verifyAppWriteAccess: fallback,
        },
      ),
    ).rejects.toMatchObject({ code: 'PAT_CREATE_REPO_FAILED' });
    expect(fallback).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects creation under a different personal owner before mutation', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ login: 'bob' }))
      .mockResolvedValueOnce(Response.json({ type: 'User' }));
    await expect(
      createAgentTargetRepository(
        { owner: 'alice', repo: 'new' },
        { githubToken: 'pat' },
        {
          createTokenClient: () =>
            new Octokit({ request: { fetch: fetchImpl } }),
        },
      ),
    ).rejects.toMatchObject({ code: 'PAT_OWNER_MISMATCH' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
