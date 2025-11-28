import type { IRouteContext } from './types.ts';
import { createGitHubFolderStructure } from '@/utils/createGitHubFolderStructure.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

interface ICreateFolderStructureRequest {
  structure?: unknown;
  owner?: unknown;
  repo?: unknown;
  basePath?: unknown;
  branch?: unknown;
  commitMessage?: unknown;
  projectName?: unknown;
}

function isCreateFolderStructureRequest(
  body: unknown,
): body is ICreateFolderStructureRequest {
  return body !== null && typeof body === 'object';
}

const isValidStructureItem = (item: unknown): boolean => {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  if (!('type' in item) || !('name' in item)) {
    return false;
  }
  const itemWithProps = item;
  const typeProp = 'type' in itemWithProps ? itemWithProps.type : undefined;
  if (typeof typeProp !== 'string') {
    return false;
  }
  return typeProp === 'file' || typeProp === 'folder';
};

const isValidStructure = (val: unknown): val is IStructure => {
  if (!Array.isArray(val)) {
    return false;
  }
  return val.every(isValidStructureItem);
};

export const createGitHubFolderStructureHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const body = await c.req.json();
    if (!isCreateFolderStructureRequest(body)) {
      return c.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be an object',
      });
    }

    const structure = body.structure;
    const owner = body.owner;
    const repo = body.repo;
    const basePath = body.basePath;
    const branch = body.branch;
    const commitMessage = body.commitMessage;
    const projectName = body.projectName;

    if (!Array.isArray(structure)) {
      return c.status(400).json({
        error: 'Missing required field',
        message: 'structure is required and must be an array',
      });
    }

    if (typeof owner !== 'string' || owner === '') {
      return c.status(400).json({
        error: 'Missing required field',
        message: 'owner is required',
      });
    }

    if (typeof repo !== 'string' || repo === '') {
      return c.status(400).json({
        error: 'Missing required field',
        message: 'repo is required',
      });
    }

    const githubToken = await getGitHubToken(auth0UserId);

    if (githubToken === null || githubToken === '') {
      return c.status(400).json({
        error: 'GitHub token not found',
        message:
          'Please set your GitHub token in the settings before uploading files',
      });
    }

    if (!isValidStructure(structure)) {
      return c.status(400).json({
        error: 'Invalid structure format',
        message: 'structure must be a valid IStructure array',
      });
    }

    const result = await createGitHubFolderStructure({
      structure,
      owner,
      repo,
      githubToken,
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
    });

    return c.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};
