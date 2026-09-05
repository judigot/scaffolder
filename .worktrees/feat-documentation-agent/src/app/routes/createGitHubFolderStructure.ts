import { Hono } from 'hono';
import { createGitHubFolderStructure } from '@/utils/createGitHubFolderStructure.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { detectUserEnvInStructure } from '@/utils/project-builder/utils/detectUserEnvUsage.ts';

const router = new Hono();

interface ICreateGitHubFolderStructureBody {
  structure?: unknown;
  owner?: unknown;
  repo?: unknown;
  basePath?: unknown;
  branch?: unknown;
  commitMessage?: unknown;
  projectName?: unknown;
  method?: unknown;
}

const isCreateGitHubFolderStructureBody = (
  val: unknown,
): val is ICreateGitHubFolderStructureBody => {
  return typeof val === 'object' && val !== null;
};

interface IItemWithType {
  type: unknown;
  name: unknown;
}

const hasTypeAndName = (item: unknown): item is IItemWithType => {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    'name' in item
  );
};

const isValidStructureItem = (item: unknown): boolean => {
  if (!hasTypeAndName(item)) {
    return false;
  }

  if (typeof item.type !== 'string') {
    return false;
  }

  if (item.type !== 'file' && item.type !== 'folder') {
    return false;
  }

  return true;
};

const isValidStructure = (val: unknown): val is IStructure => {
  if (!Array.isArray(val)) {
    return false;
  }
  return val.every(isValidStructureItem);
};

router.post('/', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const auth0UserId = verification.auth0UserId;

  if (auth0UserId === '') {
    return c.json({ error: 'User ID not found in token' }, 401);
  }

  const body = await c.req.json<ICreateGitHubFolderStructureBody>();

  if (!isCreateGitHubFolderStructureBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const structure = body.structure;
  const owner = body.owner;
  const repo = body.repo;
  const basePath = body.basePath;
  const branch = body.branch;
  const commitMessage = body.commitMessage;
  const projectName = body.projectName;
  const method = body.method;

  if (!Array.isArray(structure)) {
    return c.json(
      {
        error: 'Missing required field',
        message: 'structure is required and must be an array',
      },
      400,
    );
  }

  if (typeof owner !== 'string' || owner === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'owner is required',
      },
      400,
    );
  }

  if (typeof repo !== 'string' || repo === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'repo is required',
      },
      400,
    );
  }

  if (!isValidStructure(structure)) {
    return c.json(
      {
        error: 'Invalid structure format',
        message: 'structure must be a valid IStructure array',
      },
      400,
    );
  }

  // Security check: Detect USE_USER_ENV usage before committing to GitHub
  // This prevents secrets from being committed to repositories
  const userEnvDetection = detectUserEnvInStructure(structure);
  if (userEnvDetection.hasUserEnv) {
    const fileList = userEnvDetection.locations
      .map((loc) => `  - ${loc.filePath}`)
      .join('\n');
    return c.json(
      {
        error: 'USE_USER_ENV detected',
        message:
          `Cannot commit to GitHub: USE_USER_ENV detected in generated files. This would expose your secrets.\n\n` +
          `Found in:\n${fileList}\n\n` +
          `Options:\n` +
          `1. Remove USE_USER_ENV from templates and use placeholders (e.g., \${KEY_NAME} or process.env.KEY_NAME)\n` +
          `2. Download files locally instead (USE_USER_ENV works for local files)\n` +
          `3. Use environment variable references in code (process.env.KEY_NAME)`,
        locations: userEnvDetection.locations,
      },
      400,
    );
  }

  try {
    const result = await createGitHubFolderStructure({
      structure,
      owner,
      repo,
      basePath:
        typeof basePath === 'string' && basePath !== '' ? basePath : undefined,
      branch: typeof branch === 'string' && branch !== '' ? branch : undefined,
      commitMessage:
        typeof commitMessage === 'string' && commitMessage !== ''
          ? commitMessage
          : undefined,
      projectName:
        typeof projectName === 'string' && projectName !== ''
          ? projectName
          : undefined,
      method:
        method === 'personal_token' || method === 'github_app'
          ? method
          : undefined,
      auth0UserId,
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
