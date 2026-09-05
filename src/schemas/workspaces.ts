import { z } from 'zod';
import { WORKSPACE_STATUS_VALUES } from '@/interfaces/IWorkspace.ts';

const domainRegex =
  /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

export const WorkspaceProvisionRequestSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(1, { message: 'workspaceName is required' }),
  domain: z.string().trim().regex(domainRegex, {
    message: 'domain must be a valid fully-qualified domain name',
  }),
  opencodeUsername: z.string().trim().min(1).optional(),
  opencodePassword: z.string().trim().min(1).optional(),
  anthropicApiKey: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
  instanceType: z.string().trim().min(1).optional(),
  sshPublicKeyName: z.string().trim().min(1).optional(),
});

export const WorkspaceStatusSchema = z.enum(WORKSPACE_STATUS_VALUES);

export type IWorkspaceProvisionRequestParsed = z.infer<
  typeof WorkspaceProvisionRequestSchema
>;
