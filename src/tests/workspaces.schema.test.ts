import { describe, expect, it } from 'vitest';
import { WorkspaceProvisionRequestSchema } from '@/schemas/workspaces.ts';

describe('WorkspaceProvisionRequestSchema', () => {
  it('accepts a valid workspace request', () => {
    const result = WorkspaceProvisionRequestSchema.safeParse({
      workspaceName: 'alice-dev',
      domain: 'alice-dev.example.com',
      region: 'us-east-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid domain', () => {
    const result = WorkspaceProvisionRequestSchema.safeParse({
      workspaceName: 'alice-dev',
      domain: 'localhost',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing workspaceName', () => {
    const result = WorkspaceProvisionRequestSchema.safeParse({
      domain: 'alice-dev.example.com',
    });

    expect(result.success).toBe(false);
  });
});
