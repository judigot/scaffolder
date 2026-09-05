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

function hasProjectIdentifier(data: {
  project_url?: string;
  project?: string;
}): boolean {
  const hasUrl = data.project_url !== undefined && data.project_url !== '';
  const hasLegacyName = data.project !== undefined && data.project !== '';
  return hasUrl || hasLegacyName;
}

export const AgentScaffoldRequestSchema = z
  .strictObject({
    schemaInfo: z.union([z.array(z.unknown()), z.string().trim().min(1)]),
    // GitHub URL to Projects/<name> in the caller's scaffolder-files repo.
    project_url: z.string().trim().min(1).optional(),
    // Legacy catalog folder name. Prefer project_url.
    project: z.string().trim().min(1).optional(),
    target_repo: z
      .string()
      .trim()
      .min(1, { message: 'target_repo is required' }),
    // Pinned GitHub starter. Overrides structure.yaml $BASE / source.
    template_repo: z.string().trim().min(1).optional(),
    // Create target_repo when missing. Private + auto_init. Default false.
    create_repo: z.boolean().optional(),
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
  .refine(hasProjectIdentifier, {
    path: ['project_url'],
    message: 'project_url is required',
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

export function resolveProjectIdentifier(
  request: IAgentScaffoldRequest,
): string {
  if (request.project_url !== undefined && request.project_url !== '') {
    return request.project_url;
  }
  if (request.project !== undefined && request.project !== '') {
    return request.project;
  }
  throw new Error('project_url is required');
}
