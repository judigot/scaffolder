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
});
