import { z } from 'zod';

export const AgentScaffoldResolveRequestSchema = z.strictObject({
  input: z.string().trim().min(1),
  schemaInfoPresent: z.boolean().optional(),
  failure: z.string().trim().min(1).optional(),
});

export const AgentScaffoldResolveResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    ok: z.literal(true),
    decision: z.strictObject({
      status: z.enum(['resolved', 'needs_review']),
      affectedSubsystem: z.enum([
        'schema-info',
        'project-builder',
        'core',
        'project',
        'golden-test',
        'auth',
        'migration',
        'openapi',
        'frontend',
        'agent-scaffold',
        'unknown',
      ]),
      recommendedTests: z.array(z.string()),
      recommendedAgent: z
        .enum([
          'project-builder',
          'project-generator',
          'golden-parity-engineer',
        ])
        .nullable(),
      needsFrontierModel: z.boolean(),
      confidence: z.number().min(0).max(1).optional(),
      provider: z.enum(['vercel-ai-gateway', 'fake']),
      evaluationMode: z.enum(['live', 'fake']),
      model: z.literal('typesafe-ai/jev').nullable(),
      reviewReason: z.enum(['uncertain', 'invalid_response']).optional(),
    }),
  }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({
      code: z.enum([
        'AI_GATEWAY_NOT_CONFIGURED',
        'DECISION_PROVIDER_TIMEOUT',
        'DECISION_PROVIDER_UNAVAILABLE',
        'FAKE_DECISION_PROVIDER_NOT_ALLOWED',
      ]),
      message: z.string(),
    }),
  }),
]);

export type IAgentScaffoldResolveRequest = z.infer<
  typeof AgentScaffoldResolveRequestSchema
>;
export type IAgentScaffoldResolveResponse = z.infer<
  typeof AgentScaffoldResolveResponseSchema
>;
