import { z } from 'zod';

export const AgentScaffoldResolveRequestSchema = z.strictObject({
  input: z.string().trim().min(1),
  schemaInfoPresent: z.boolean().optional(),
  failure: z.string().trim().min(1).optional(),
});

export type IAgentScaffoldResolveRequest = z.infer<
  typeof AgentScaffoldResolveRequestSchema
>;

