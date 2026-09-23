import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import {
  honoReactAgentSchemaInfo,
  honoReactCompactSchema,
  honoReactSchemaFilter,
} from '@/tests/helpers/honoReactAgentSchema.ts';
import { validateSchemaInfoFromResponse } from '@/utils/schemaInfoValidator.ts';
import { schemaMatchesFilter } from '@/utils/project-builder/utils/filterCompatibleProjects.ts';

const knexProjectUrl =
  'https://github.com/judigot/scaffolder-files/tree/main/Projects/ORM%20Schema%20-%20Knex';

describe('agent scaffold output documentation', () => {
  it('keeps every documented curl payload valid for hono-react', () => {
    const docs = readFileSync(
      resolve(process.cwd(), 'docs/agent-scaffold-outputs.md'),
      'utf8',
    );
    const lines = docs.split('\n');
    const payloads: unknown[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index]?.trim() !== "-d '{") continue;

      const jsonLines = ['{'];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor] ?? '';
        if (line.trim().startsWith("}'")) {
          jsonLines.push('}');
          index = cursor;
          break;
        }
        jsonLines.push(line);
      }
      payloads.push(JSON.parse(jsonLines.join('\n')));
    }

    expect(payloads).toHaveLength(5);
    const outputs: string[] = [];

    for (const payload of payloads) {
      const parsed = AgentScaffoldRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (!parsed.success || typeof parsed.data.schemaInfo !== 'string') {
        continue;
      }

      outputs.push(parsed.data.output ?? 'github_pr');
      expect(parsed.data.schemaInfo).toContain('\n');
      expect(parsed.data.schemaInfo).not.toContain('\\n');

      const schemaResult = validateSchemaInfoFromResponse(
        parsed.data.schemaInfo,
      );
      expect(schemaResult.success).toBe(true);
      expect(schemaResult.data).toBeDefined();
      if (schemaResult.data !== undefined) {
        expect(
          schemaMatchesFilter(schemaResult.data, honoReactSchemaFilter),
        ).toBe(true);
      }
    }

    expect(outputs).toEqual([
      'github_pr',
      'zip',
      'zip',
      'sh',
      'sh',
    ]);

    expect(
      payloads.map((payload) =>
        typeof payload === 'object' &&
        payload !== null &&
        'files' in payload
          ? payload.files
          : undefined,
      ),
    ).toEqual([
      undefined,
      undefined,
      ['src/**', 'README.md'],
      undefined,
      ['api/**', 'api-test.sh'],
    ]);
  });
});

describe('AgentScaffoldRequestSchema', () => {
  it('accepts a scaffolder-files project_url with encoded spaces', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      target_repo: 'https://github.com/judigot/bookingwars',
      draft: true,
      project_url: knexProjectUrl,
      schemaInfo: '<@@SCHEMA@@>\n@users:id:n#pk,email:s\n<@@/SCHEMA@@>',
    });

    expect(result.success).toBe(true);
  });

  it('accepts the agent project-creation payload', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: [
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
      ],
      project_url:
        'https://github.com/judigot/scaffolder-files/tree/main/Projects/hono-react',
      target_repo: 'https://github.com/judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts compact schemaInfo as a string', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: '<@@SCHEMA@@>\n@users:id:n#pk,email:s\n<@@/SCHEMA@@>',
      project_url:
        'https://github.com/alice/my-scaffolder-files/tree/main/Projects/hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a hono-react uuid schemaInfo payload', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactAgentSchemaInfo,
      project_url:
        'https://github.com/alice/my-scaffolder-files/tree/main/Projects/hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts compact hono-react schemaInfo with uuid and camelCase columns', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url:
        'https://github.com/alice/my-scaffolder-files/tree/main/Projects/hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a legacy project folder name', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing project_url and project', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(false);
  });

  it('accepts zip and sh outputs without target_repo', () => {
    for (const output of ['zip', 'sh'] as const) {
      const result = AgentScaffoldRequestSchema.safeParse({
        schemaInfo: honoReactCompactSchema,
        project_url: knexProjectUrl,
        output,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts selective files for zip and sh outputs', () => {
    for (const output of ['zip', 'sh'] as const) {
      for (const files of [
        ['*'],
        ['package.json', 'src/main.tsx'],
        ['src/**', 'public/**'],
      ]) {
        const result = AgentScaffoldRequestSchema.safeParse({
          schemaInfo: honoReactCompactSchema,
          project_url: knexProjectUrl,
          output,
          files,
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it('rejects files for explicit and default github_pr output', () => {
    for (const output of [undefined, 'github_pr'] as const) {
      const result = AgentScaffoldRequestSchema.safeParse({
        schemaInfo: honoReactCompactSchema,
        project_url: knexProjectUrl,
        target_repo: 'judigot/bookingwars',
        ...(output === undefined ? {} : { output }),
        files: ['src/**'],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['files'],
              message: 'files is only supported for zip and sh outputs',
            }),
          ]),
        );
      }
    }
  });

  it('rejects empty, blank, unsafe and unsupported file selectors', () => {
    const empty = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      output: 'zip',
      files: [],
    });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues.map((issue) => issue.path.join('.'))).toContain(
        'files',
      );
    }

    for (const selector of [
      '',
      ' ',
      '/absolute',
      '../escape',
      'src/../escape',
      'C:\\absolute',
      'src\\main.tsx',
      'src/[ab].ts',
      'src/file?.ts',
      'src/{a,b}.ts',
      'src/+(a).ts',
      '**',
      'src/**/nested.ts',
    ]) {
      const result = AgentScaffoldRequestSchema.safeParse({
        schemaInfo: honoReactCompactSchema,
        project_url: knexProjectUrl,
        output: 'sh',
        files: [selector],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.map((issue) => issue.path.join('.')),
        ).toContain('files.0');
      }
    }
  });

  it('rejects GitHub-only fields for export outputs with actionable paths', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      output: 'zip',
      target_repo: 'judigot/bookingwars',
      branch: 'scaffolder/test',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['target_repo', 'branch']),
      );
    }
  });

  it('rejects unsupported output values', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      output: 'tar',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain(
        'output',
      );
    }
  });

  it('accepts explicit github_pr output', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      output: 'github_pr',
      target_repo: 'judigot/bookingwars',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing target_repo', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: [],
      project_url: knexProjectUrl,
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: [],
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      extra: true,
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional template_repo and create_repo', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/new-app',
      template_repo: 'https://github.com/judigot/template-monorepo',
      create_repo: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.create_repo).toBe(true);
      expect(result.data.template_repo).toBe(
        'https://github.com/judigot/template-monorepo',
      );
    }
  });

  it('defaults create_repo to omitted rather than true', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.create_repo).toBeUndefined();
    }
  });

  it('accepts optional prNumber and prUrl targeting fields', () => {
    const byNumber = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prNumber: 2,
    });
    const byUrl = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prUrl: 'https://github.com/judigot/bookingwars/pull/2',
    });
    const byBranch = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      branch: 'scaffolder/hono-react-ab12',
    });

    expect(byNumber.success).toBe(true);
    expect(byUrl.success).toBe(true);
    expect(byBranch.success).toBe(true);
  });

  it('accepts branch and prNumber together for later head matching', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      branch: 'scaffolder/hono-react-ab12',
      prNumber: 2,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-positive prNumber', () => {
    const zero = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prNumber: 0,
    });
    const negative = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prNumber: -1,
    });

    expect(zero.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it('rejects a prUrl that is not a GitHub pull request URL', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prUrl: 'https://github.com/judigot/bookingwars',
    });

    expect(result.success).toBe(false);
  });

  it('rejects prNumber that does not match prUrl', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project_url: knexProjectUrl,
      target_repo: 'judigot/bookingwars',
      prNumber: 1,
      prUrl: 'https://github.com/judigot/bookingwars/pull/2',
    });

    expect(result.success).toBe(false);
  });
});
