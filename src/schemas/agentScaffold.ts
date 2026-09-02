import { z } from 'zod';

export const AgentScaffoldRequestSchema = z.strictObject({
  schemaInfo: z.union([z.array(z.unknown()), z.string().trim().min(1)]),
  project: z.string().trim().min(1, { message: 'project is required' }),
  target_repo: z.string().trim().min(1, { message: 'target_repo is required' }),
  branch: z.string().trim().min(1).optional(),
  prTitle: z.string().trim().min(1).optional(),
  prBody: z.string().trim().min(1).optional(),
  draft: z.boolean().optional(),
});

export type IAgentScaffoldRequest = z.infer<typeof AgentScaffoldRequestSchema>;
