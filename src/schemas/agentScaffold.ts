import { z } from 'zod';
import { parsePullRequestUrl } from '@/utils/parseAgentScaffoldUrls.ts';

function isGitHubPullRequestUrl(value: string): boolean {
  try {
    parsePullRequestUrl(value);
    return true;
  } catch {
    return false;
  }
}

export const AgentScaffoldRequestSchema = z
  .strictObject({
    schemaInfo: z.union([z.array(z.unknown()), z.string().trim().min(1)]),
    project: z.string().trim().min(1, { message: 'project is required' }),
    target_repo: z
      .string()
      .trim()
      .min(1, { message: 'target_repo is required' }),
    branch: z.string().trim().min(1).optional(),
    prTitle: z.string().trim().min(1).optional(),
    prBody: z.string().trim().min(1).optional(),
    draft: z.boolean().optional(),
    prNumber: z.number().int().positive().optional(),
    prUrl: z
      .string()
      .trim()
      .min(1)
      .refine(isGitHubPullRequestUrl, {
        message:
          'prUrl must be a GitHub pull request URL (for example https://github.com/owner/repo/pull/2)',
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.prUrl === undefined || data.prNumber === undefined) {
        return true;
      }
      return parsePullRequestUrl(data.prUrl).prNumber === data.prNumber;
    },
    {
      path: ['prNumber'],
      message: 'prNumber must match prUrl',
    },
  );

export type IAgentScaffoldRequest = z.infer<typeof AgentScaffoldRequestSchema>;
