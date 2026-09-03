import { describe, expect, it } from 'vitest';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import {
  honoReactAgentSchemaInfo,
  honoReactCompactSchema,
} from '@/tests/helpers/honoReactAgentSchema.ts';

describe('AgentScaffoldRequestSchema', () => {
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
      project:
        'https://github.com/judigot/scaffolder-files/tree/main/Projects/hono-react',
      target_repo: 'https://github.com/judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts compact schemaInfo as a string', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: '<@@SCHEMA@@>\n@users:id:n#pk,email:s\n<@@/SCHEMA@@>',
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a hono-react uuid schemaInfo payload', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactAgentSchemaInfo,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('accepts compact hono-react schemaInfo with uuid and camelCase columns', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing target_repo', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: [],
      project: 'hono-react',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: [],
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      extra: true,
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional prNumber and prUrl targeting fields', () => {
    const byNumber = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prNumber: 2,
    });
    const byUrl = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prUrl: 'https://github.com/judigot/bookingwars/pull/2',
    });
    const byBranch = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
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
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      branch: 'scaffolder/hono-react-ab12',
      prNumber: 2,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-positive prNumber', () => {
    const zero = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prNumber: 0,
    });
    const negative = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prNumber: -1,
    });

    expect(zero.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it('rejects a prUrl that is not a GitHub pull request URL', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prUrl: 'https://github.com/judigot/bookingwars',
    });

    expect(result.success).toBe(false);
  });

  it('rejects prNumber that does not match prUrl', () => {
    const result = AgentScaffoldRequestSchema.safeParse({
      schemaInfo: honoReactCompactSchema,
      project: 'hono-react',
      target_repo: 'judigot/bookingwars',
      prNumber: 1,
      prUrl: 'https://github.com/judigot/bookingwars/pull/2',
    });

    expect(result.success).toBe(false);
  });
});
