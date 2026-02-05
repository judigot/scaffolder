/**
 * Zod schemas for API response validation
 * Provides runtime type safety for API responses
 */

import { z } from 'zod';

// =============================================================================
// Infrastructure Panel Schemas
// =============================================================================

export const TfcWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const WorkspacesResponseSchema = z.object({
  success: z.boolean(),
  workspaces: z.array(TfcWorkspaceSchema),
});

export const TerraformRunSchema = z.object({
  id: z.string(),
  status: z.string(),
});

export const TerraformRunResponseSchema = z.object({
  run: TerraformRunSchema,
});

export const TerraformStatusResponseSchema = z.object({
  enableEc2: z.boolean(),
  customAmi: z.string().nullable().optional(),
  outputs: z.record(z.string(), z.unknown()),
});

export const TerraformVariablesResponseSchema = z.object({
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string().nullable().optional(),
      sensitive: z.boolean().optional(),
      category: z.string().optional(),
    }),
  ),
});

export const TerraformStateResponseSchema = z.object({
  resources: z.array(z.unknown()).optional(),
});

export const TerraformCreateRunResponseSchema = z.object({
  run: z
    .object({
      id: z.string(),
    })
    .optional(),
});

// =============================================================================
// Error Response Schemas
// =============================================================================

export const ErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

// Helper to safely extract error message
export function getErrorMessage(data: unknown, fallback: string): string {
  const result = ErrorResponseSchema.safeParse(data);
  if (result.success) {
    return result.data.message ?? result.data.error ?? fallback;
  }
  return fallback;
}

// =============================================================================
// Chat App Schemas
// =============================================================================

export const CloneResponseSchema = z.object({
  path: z.string(),
  branch: z.string().optional(),
  name: z.string().optional(),
});

export const WorktreeCreateResponseSchema = z.object({
  worktreePath: z.string(),
  branch: z.string(),
});

export const WorktreeValidationResponseSchema = z.object({
  valid: z.boolean(),
  branch: z.string().optional(),
  commitCount: z.number().optional(),
  error: z.string().optional(),
});

export const WorktreePostValidationResponseSchema = z.object({
  valid: z.boolean(),
  branch: z.string().optional(),
  newCommits: z.number().optional(),
  totalCommits: z.number().optional(),
  lastCommitMessage: z.string().optional(),
  filesChanged: z.array(z.string()).optional(),
  branchRenamed: z.boolean().optional(),
  newWorktreePath: z.string().optional(),
  error: z.string().optional(),
});

export const PRCreateResponseSchema = z.object({
  url: z.string(),
  number: z.number().optional(),
});

// =============================================================================
// Repo Status Schemas
// =============================================================================

export const RepoStatusResponseSchema = z.object({
  ok: z.boolean(),
  branch: z.string().optional(),
  isGitRepo: z.boolean().optional(),
  hasRemote: z.boolean().optional(),
  remoteUrl: z.string().optional(),
});

// =============================================================================
// OpenCode Schemas
// =============================================================================

export const OpenCodeHealthSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
});

// =============================================================================
// Workspace Variables Schemas
// =============================================================================

export const VariablesResponseSchema = z.object({
  variables: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      category: z.enum(['env', 'terraform']),
      sensitive: z.boolean(),
    }),
  ),
});

// =============================================================================
// Type exports (inferred from schemas)
// =============================================================================

export type ITfcWorkspace = z.infer<typeof TfcWorkspaceSchema>;
export type IWorkspacesResponse = z.infer<typeof WorkspacesResponseSchema>;
export type ITerraformRunResponse = z.infer<typeof TerraformRunResponseSchema>;
export type ITerraformStatusResponse = z.infer<
  typeof TerraformStatusResponseSchema
>;
export type ICloneResponse = z.infer<typeof CloneResponseSchema>;
export type IWorktreeCreateResponse = z.infer<
  typeof WorktreeCreateResponseSchema
>;
export type IRepoStatusResponse = z.infer<typeof RepoStatusResponseSchema>;
export type IOpenCodeHealth = z.infer<typeof OpenCodeHealthSchema>;
export type IVariablesResponse = z.infer<typeof VariablesResponseSchema>;
