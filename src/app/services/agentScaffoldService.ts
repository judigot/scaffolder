import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';
import { createAgentTokenClient } from '@/app/services/agentGitHubToken.ts';
import { fetchPublicGitHubSource } from '@/app/services/publicSourceFetch.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { CREATION_MODES } from '@/constants.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import {
  parseAndValidateSchemaInfo,
  parseCompactSchema,
  validateSchemaInfo,
  type SchemaInfoArray,
} from '@/utils/schemaInfoValidator.ts';
import {
  getAllProjects,
  schemaMatchesFilter,
} from '@/utils/project-builder/utils/filterCompatibleProjects.ts';
import {
  buildProjectFiles,
  type IBuildProjectFilesResult,
} from '@/utils/project-builder/buildProjectFiles.ts';
import type { ILoadCoreFilesOptions } from '@/utils/project-builder/utils/loadCoreFiles.ts';
import { CoreMergeError } from '@/utils/project-builder/utils/loadCoreFiles.ts';
import {
  findStructureYamlContent,
  parseRecipeDirectives,
} from '@/utils/project-builder/utils/recipeDirectives.ts';
import { fetchPinnedRepoTarball } from '@/utils/fetchPinnedRepoTarball.ts';
import {
  fetchResolvedRemoteBase,
  resolveTemplateBase,
  TemplateBaseError,
  type IResolvedTemplateBase,
} from '@/utils/project-builder/utils/resolveTemplateBase.ts';
import {
  GitHubSnapshotError,
  createGitHubSnapshotLookup,
  resolveGitHubSnapshot,
  type IGitHubSnapshotLookup,
} from '@/utils/resolveGitHubSnapshot.ts';
import {
  AgentCreateRepoError,
  createAgentTargetRepository,
} from '@/app/services/agentCreateRepoService.ts';
import {
  SCAFFOLDER_MESSAGE_CODES,
  type IScaffolderMessage,
} from '@/interfaces/scaffolderMessages.ts';
import { detectUserEnvInStructure } from '@/utils/project-builder/utils/detectUserEnvUsage.ts';
import {
  resolveProjectIdentifier,
  type IAgentScaffoldRequest,
} from '@/schemas/agentScaffold.ts';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';
import {
  ensureScaffolderBranchName,
  isProtectedBranchName,
  isSameTargetRepo,
  parseProjectReference,
  parsePullRequestUrl,
  parseTargetRepo,
  shouldFetchRemoteScaffolderFiles,
  toScaffolderBranchName,
  type IParsedProjectReference,
  type IParsedTargetRepo,
} from '@/utils/parseAgentScaffoldUrls.ts';
import {
  GitHubDraftPullRequestError,
  publishDraftPullRequest,
  type IDraftPullRequestResult,
  type IPublishDraftPullRequestParams,
} from '@/app/services/githubDraftPullRequestService.ts';

export class AgentScaffoldError extends Error {
  readonly status: 400 | 403 | 409 | 500;
  readonly code: string;
  readonly details?: unknown;
  readonly installationUrl?: string;

  constructor(
    message: string,
    options: {
      status: 400 | 403 | 409 | 500;
      code: string;
      details?: unknown;
      installationUrl?: string;
    },
  ) {
    super(message);
    this.name = 'AgentScaffoldError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.installationUrl = options.installationUrl;
  }
}

export interface IAgentScaffoldResult extends IDraftPullRequestResult {
  projectName: string;
  targetRepo: string;
  tables: string[];
  repoCreated?: boolean;
  resolvedSha?: string;
  projectResolvedSha?: string;
}

export interface IRemoteScaffolderFilesRequest {
  owner: string;
  repo: string;
  ref: string | null;
}

export interface IAgentScaffoldServiceDependencies {
  auth0UserId?: string;
  githubToken?: string;
  createTokenClient?: typeof createAgentTokenClient;
  loadUserFiles?: () => IStructure;
  loadRemoteUserFiles?: (
    request: IRemoteScaffolderFilesRequest,
  ) => Promise<IStructure>;
  loadTemplateFiles?: (templateRepo: string) => Promise<IStructure>;
  githubSnapshotLookup?: IGitHubSnapshotLookup;
  createRepo?: (params: {
    owner: string;
    repo: string;
    auth0UserId?: string;
  }) => Promise<{ created: boolean; repoUrl: string }>;
  buildProject?: (
    projectYamlPath: string,
    userFiles: IStructure,
    schemaInfo: ISchemaInfo[],
    formData: IFormStore,
    userMetadata?: Record<string, unknown> | null,
    coreOptions?: ILoadCoreFilesOptions,
  ) => Promise<IBuildProjectFilesResult>;
  publish?: (
    params: IPublishDraftPullRequestParams,
  ) => Promise<IDraftPullRequestResult>;
  randomId?: () => string;
}

async function defaultLoadRemoteUserFiles(
  request: IRemoteScaffolderFilesRequest,
  lookup: IGitHubSnapshotLookup | undefined,
): Promise<{ files: IStructure; resolvedSha: string }> {
  const snapshot = await resolveGitHubSnapshot(
    {
      owner: request.owner,
      repo: request.repo,
      ref: request.ref,
    },
    lookup ?? createGitHubSnapshotLookup(fetchPublicGitHubSource),
  );
  const extractedFiles = await fetchPinnedRepoTarball({
    owner: request.owner,
    repo: request.repo,
    sha: snapshot.resolvedSha,
  });
  return {
    files: convertPublicRepoFilesToStructure(extractedFiles),
    resolvedSha: snapshot.resolvedSha,
  };
}

async function resolveUserFiles(
  projectReference: IParsedProjectReference,
  dependencies: IAgentScaffoldServiceDependencies,
): Promise<{ files: IStructure; resolvedSha?: string }> {
  if (dependencies.loadUserFiles !== undefined) {
    return { files: dependencies.loadUserFiles() };
  }

  if (
    shouldFetchRemoteScaffolderFiles(projectReference) &&
    projectReference.owner !== null &&
    projectReference.repo !== null
  ) {
    if (dependencies.loadRemoteUserFiles !== undefined) {
      try {
        return {
          files: await dependencies.loadRemoteUserFiles({
            owner: projectReference.owner,
            repo: projectReference.repo,
            ref: projectReference.ref,
          }),
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to fetch scaffolder files repository';
        throw new AgentScaffoldError(message, {
          status: 400,
          code: 'FILES_REPO_FETCH_FAILED',
          details: {
            filesRepoUrl: projectReference.filesRepoUrl,
            ref: projectReference.ref,
          },
        });
      }
    }

    try {
      return await defaultLoadRemoteUserFiles(
        {
          owner: projectReference.owner,
          repo: projectReference.repo,
          ref: projectReference.ref,
        },
        dependencies.githubSnapshotLookup,
      );
    } catch (error: unknown) {
      if (error instanceof GitHubSnapshotError) {
        throw new AgentScaffoldError(error.message, {
          status: 400,
          code: 'FILES_REPO_FETCH_FAILED',
          details: {
            filesRepoUrl: projectReference.filesRepoUrl,
            ref: projectReference.ref,
          },
        });
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch scaffolder files repository';
      throw new AgentScaffoldError(message, {
        status: 400,
        code: 'FILES_REPO_FETCH_FAILED',
        details: {
          filesRepoUrl: projectReference.filesRepoUrl,
          ref: projectReference.ref,
        },
      });
    }
  }

  return { files: convertLocalFilesToIStructure('files') };
}

function createAgentFormData(
  projectName: string,
  filesRepoUrl: string | null,
): IFormStore {
  return {
    schemaInput: {},
    backendUrl: 'http://localhost:3000',
    backendDir: '',
    frontendDir: '',
    dbConnection: '',
    framework: frameworks.HONO,
    includeInsertData: false,
    insertOption: 'SQLInsertQueriesFromMockData',
    includeTypeGuards: false,
    outputOnSingleFile: false,
    dbType: 'postgresql',
    quote: '"',
    publicRepoURL: filesRepoUrl ?? '',
    clientID: '',
    clientSecret: '',
    creationMode: CREATION_MODES.SCHEMA_BUILDER,
    dbUsername: '',
    dbPassword: '',
    dbHost: '',
    dbPort: 0,
    dbName: '',
    projectName,
    setCreationMode: () => {
      return;
    },
    setMasterSchema: () => {
      return;
    },
    setOneToOne: () => {
      return;
    },
    setOneToMany: () => {
      return;
    },
    setManyToMany: () => {
      return;
    },
    setDBType: () => {
      return;
    },
    setPublicRepoURL: () => {
      return;
    },
    setDbConnection: () => {
      return;
    },
  };
}

function findBuildMessage(
  messages: IScaffolderMessage[] | undefined,
  code: (typeof SCAFFOLDER_MESSAGE_CODES)[keyof typeof SCAFFOLDER_MESSAGE_CODES],
): IScaffolderMessage | undefined {
  if (messages === undefined) {
    return undefined;
  }
  return messages.find((message) => message.code === code);
}

function resolveSchemaInfo(schemaInfo: unknown): SchemaInfoArray {
  if (typeof schemaInfo === 'string') {
    const compact = parseCompactSchema(schemaInfo);
    if (compact !== null) {
      return compact;
    }
    const parsed = parseAndValidateSchemaInfo(schemaInfo);
    if (!parsed.success || parsed.data === undefined) {
      throw new AgentScaffoldError('schemaInfo is invalid', {
        status: 400,
        code: 'INVALID_SCHEMA',
        details: parsed.errors,
      });
    }
    return parsed.data;
  }

  const result = validateSchemaInfo(schemaInfo);
  if (!result.success || result.data === undefined) {
    throw new AgentScaffoldError('schemaInfo is invalid', {
      status: 400,
      code: 'INVALID_SCHEMA',
      details: result.errors,
    });
  }
  return result.data;
}

function resolveTargetedPullNumber(
  request: IAgentScaffoldRequest,
  targetRepo: IParsedTargetRepo,
): number | undefined {
  if (request.prUrl === undefined) {
    return request.prNumber;
  }

  const parsed = parsePullRequestUrl(request.prUrl);
  if (
    !isSameTargetRepo({ owner: parsed.owner, repo: parsed.repo }, targetRepo)
  ) {
    throw new AgentScaffoldError(
      `prUrl must target ${targetRepo.owner}/${targetRepo.repo}`,
      { status: 400, code: 'PR_REPO_MISMATCH' },
    );
  }

  if (request.prNumber !== undefined && request.prNumber !== parsed.prNumber) {
    throw new AgentScaffoldError('prNumber must match prUrl', {
      status: 400,
      code: 'BRANCH_PR_MISMATCH',
    });
  }

  return parsed.prNumber;
}

function throwTemplateBaseAsAgentError(error: unknown): never {
  if (error instanceof TemplateBaseError) {
    throw new AgentScaffoldError(error.message, {
      status: 400,
      code: error.code,
    });
  }
  if (error instanceof AgentScaffoldError) {
    throw error;
  }
  const message =
    error instanceof Error ? error.message : 'Invalid template_repo';
  throw new AgentScaffoldError(message, {
    status: 400,
    code: 'INVALID_TEMPLATE_REPO',
  });
}

async function resolveAndFetchTemplateBase(
  requestOverride: string | undefined,
  recipeBase: string | null,
  dependencies: IAgentScaffoldServiceDependencies,
): Promise<{ layer?: IStructure; resolvedSha?: string }> {
  const resolved = ((): IResolvedTemplateBase => {
    try {
      return resolveTemplateBase(requestOverride, recipeBase);
    } catch (error: unknown) {
      throwTemplateBaseAsAgentError(error);
    }
  })();

  if (resolved.kind !== 'remote') {
    return {};
  }

  try {
    return await fetchResolvedRemoteBase(
      resolved,
      dependencies.loadTemplateFiles,
      {
        snapshotLookup:
          dependencies.githubSnapshotLookup ??
          (dependencies.loadTemplateFiles === undefined
            ? createGitHubSnapshotLookup(fetchPublicGitHubSource)
            : undefined),
      },
    );
  } catch (error: unknown) {
    if (error instanceof AgentScaffoldError) {
      throw error;
    }
    if (error instanceof TemplateBaseError) {
      throwTemplateBaseAsAgentError(error);
    }
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch template tarball';
    throw new AgentScaffoldError(message, {
      status: 400,
      code: 'TEMPLATE_FETCH_FAILED',
      details: {
        templateRepo: `${resolved.parsed.owner}/${resolved.parsed.repo}`,
        ref: resolved.parsed.ref,
      },
    });
  }
}

function createdRepoRecoveryDetails(targetRepo: IParsedTargetRepo): {
  repoCreated: true;
  repoUrl: string;
  recovery: string;
} {
  return {
    repoCreated: true,
    repoUrl: `https://github.com/${targetRepo.owner}/${targetRepo.repo}`,
    recovery:
      'The destination repository was created. Retry publication without create_repo, or delete the empty repository before retrying with create_repo.',
  };
}

async function createTargetRepoIfRequested(
  request: IAgentScaffoldRequest,
  targetRepo: IParsedTargetRepo,
  dependencies: IAgentScaffoldServiceDependencies,
): Promise<boolean> {
  if (request.create_repo !== true) {
    return false;
  }

  const createRepo =
    dependencies.createRepo ??
    ((params) =>
      createAgentTargetRepository(
        { owner: params.owner, repo: params.repo },
        {
          auth0UserId: params.auth0UserId,
          githubToken: dependencies.githubToken,
        },
        { createTokenClient: dependencies.createTokenClient },
      ));

  try {
    const created = await createRepo({
      owner: targetRepo.owner,
      repo: targetRepo.repo,
      auth0UserId: dependencies.auth0UserId,
    });
    return created.created;
  } catch (error: unknown) {
    if (error instanceof AgentCreateRepoError) {
      throw new AgentScaffoldError(error.message, {
        status: error.status,
        code: error.code,
        details: error.details,
        installationUrl: error.installationUrl,
      });
    }
    throw error;
  }
}

export async function scaffoldToPullRequest(
  request: IAgentScaffoldRequest,
  dependencies: IAgentScaffoldServiceDependencies = {},
): Promise<IAgentScaffoldResult> {
  let projectReference: IParsedProjectReference;
  let targetRepo: IParsedTargetRepo;
  try {
    projectReference = parseProjectReference(resolveProjectIdentifier(request));
    targetRepo = parseTargetRepo(request.target_repo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid project or target_repo';
    throw new AgentScaffoldError(message, {
      status: 400,
      code: 'INVALID_REFERENCE',
    });
  }

  const schemaInfo = resolveSchemaInfo(request.schemaInfo);
  const userFilesResult = await resolveUserFiles(
    projectReference,
    dependencies,
  );
  const userFiles = userFilesResult.files;
  const projects = getAllProjects(userFiles);
  const project = projects.find(
    (item) => item.name === projectReference.projectName,
  );

  if (project === undefined) {
    const filesSource = projectReference.filesRepoUrl ?? 'scaffolder files';
    throw new AgentScaffoldError(
      `Project "${projectReference.projectName}" was not found in ${filesSource}`,
      {
        status: 400,
        code: 'PROJECT_NOT_FOUND',
        details: { availableProjects: projects.map((item) => item.name) },
      },
    );
  }

  if (!schemaMatchesFilter(schemaInfo, project.schemaFilter)) {
    throw new AgentScaffoldError(
      `schemaInfo does not satisfy ${project.name} schema filters`,
      {
        status: 400,
        code: 'SCHEMA_FILTER_FAILED',
        details: { schemaFilter: project.schemaFilter },
      },
    );
  }

  const randomId =
    dependencies.randomId ??
    (() => crypto.randomUUID().replace(/-/g, '').slice(0, 8));
  const prNumber = resolveTargetedPullNumber(request, targetRepo);
  const hasExplicitTarget =
    request.branch !== undefined || prNumber !== undefined;
  const requestedBranch =
    request.branch === undefined
      ? hasExplicitTarget
        ? undefined
        : toScaffolderBranchName(project.name, randomId())
      : ensureScaffolderBranchName(request.branch);

  if (requestedBranch !== undefined) {
    const branchWithoutPrefix = requestedBranch.replace(/^scaffolder\//, '');
    if (
      isProtectedBranchName(requestedBranch, 'main') ||
      isProtectedBranchName(branchWithoutPrefix, 'main')
    ) {
      throw new AgentScaffoldError(
        `Refusing to write to protected branch "${request.branch ?? requestedBranch}"`,
        { status: 400, code: 'PROTECTED_BRANCH' },
      );
    }
  }

  const recipeContent = findStructureYamlContent(
    projectReference.projectYamlPath,
    userFiles,
  );
  const recipe = parseRecipeDirectives(recipeContent ?? '');
  const templateBase = await resolveAndFetchTemplateBase(
    request.template_repo,
    recipe.base,
    dependencies,
  );

  const buildProject = dependencies.buildProject ?? buildProjectFiles;
  const coreOptions: ILoadCoreFilesOptions | undefined =
    templateBase.layer === undefined && request.template_repo === undefined
      ? undefined
      : {
          remoteBaseLayer: templateBase.layer,
          templateRepoOverride: request.template_repo,
          loadTemplateFiles: dependencies.loadTemplateFiles,
        };
  let buildResult: IBuildProjectFilesResult;
  try {
    buildResult = await buildProject(
      projectReference.projectYamlPath,
      userFiles,
      schemaInfo,
      createAgentFormData(project.name, projectReference.filesRepoUrl),
      undefined,
      coreOptions,
    );
  } catch (error: unknown) {
    if (error instanceof CoreMergeError) {
      throw new AgentScaffoldError(error.message, {
        status: 400,
        code: error.code,
      });
    }
    if (error instanceof TemplateBaseError) {
      throwTemplateBaseAsAgentError(error);
    }
    throw error;
  }

  if (buildResult.hasErrors === true) {
    const leftoverMessage = findBuildMessage(
      buildResult.messages,
      SCAFFOLDER_MESSAGE_CODES.LeftoverPlaceholder,
    );
    if (leftoverMessage !== undefined) {
      throw new AgentScaffoldError(leftoverMessage.title, {
        status: 400,
        code: 'LEFTOVER_PLACEHOLDER',
        details: buildResult.messages,
      });
    }
    const conflictMessage = findBuildMessage(
      buildResult.messages,
      SCAFFOLDER_MESSAGE_CODES.TemplateApiConflict,
    );
    if (conflictMessage !== undefined) {
      throw new AgentScaffoldError(conflictMessage.title, {
        status: 400,
        code: 'TEMPLATE_API_CONFLICT',
        details: buildResult.messages,
      });
    }
    throw new AgentScaffoldError('Project generation failed', {
      status: 400,
      code: 'BUILD_FAILED',
      details: buildResult.messages,
    });
  }

  const userEnvDetection = detectUserEnvInStructure(buildResult.structure);
  if (userEnvDetection.hasUserEnv) {
    throw new AgentScaffoldError(
      'Cannot commit generated files that still contain USE_USER_ENV',
      {
        status: 400,
        code: 'USER_ENV_DETECTED',
        details: userEnvDetection.locations,
      },
    );
  }

  const repoCreated = await createTargetRepoIfRequested(
    request,
    targetRepo,
    dependencies,
  );

  const draft = request.draft !== false;
  const prTitle = request.prTitle ?? `Scaffold ${project.name} from schemaInfo`;
  const provenanceLines = [
    templateBase.resolvedSha === undefined
      ? undefined
      : `- Template snapshot: \`${templateBase.resolvedSha}\``,
    userFilesResult.resolvedSha === undefined
      ? undefined
      : `- Project files snapshot: \`${userFilesResult.resolvedSha}\``,
  ].filter((line): line is string => line !== undefined);
  const prBody =
    request.prBody ??
    [
      'Draft pull request generated by Scaffolder.',
      '',
      `- Project: \`${project.name}\``,
      `- Tables: ${schemaInfo.map((table) => table.tableName).join(', ')}`,
      ...provenanceLines,
      '',
      'Review the generated files before merging. This branch was not written to the default branch.',
    ].join('\n');

  const githubToken = dependencies.githubToken;
  const publish =
    dependencies.publish ??
    ((params: IPublishDraftPullRequestParams) =>
      publishDraftPullRequest(
        params,
        githubToken === undefined
          ? {}
          : {
              getOctokit: () =>
                Promise.resolve(
                  (dependencies.createTokenClient ?? createAgentTokenClient)(
                    githubToken,
                  ),
                ),
            },
      ));

  try {
    const published = await publish({
      owner: targetRepo.owner,
      repo: targetRepo.repo,
      branch: requestedBranch,
      structure: buildResult.structure,
      commitMessage: `feat: scaffold ${project.name}`,
      prTitle,
      prBody,
      draft,
      prNumber,
      updateExisting: hasExplicitTarget,
    });

    return {
      ...published,
      projectName: project.name,
      targetRepo: `${targetRepo.owner}/${targetRepo.repo}`,
      tables: schemaInfo.map((table) => table.tableName),
      repoCreated,
      resolvedSha: templateBase.resolvedSha,
      projectResolvedSha: userFilesResult.resolvedSha,
    };
  } catch (error: unknown) {
    if (error instanceof GitHubDraftPullRequestError) {
      throw new AgentScaffoldError(error.message, {
        status: error.status,
        code: error.code,
        installationUrl: error.installationUrl,
        details: repoCreated
          ? createdRepoRecoveryDetails(targetRepo)
          : undefined,
      });
    }
    if (githubToken !== undefined) {
      throw new AgentScaffoldError(
        'PAT publication failed. Check repository access, Contents and Pull requests write permissions (and Workflows write permission when generating workflow files).',
        {
          status: 403,
          code: 'PAT_PUBLISH_FAILED',
          details: repoCreated
            ? createdRepoRecoveryDetails(targetRepo)
            : undefined,
        },
      );
    }
    if (repoCreated) {
      const message =
        error instanceof Error ? error.message : 'Failed to publish draft PR';
      throw new AgentScaffoldError(message, {
        status: 500,
        code: 'PUBLISH_FAILED_AFTER_CREATE',
        details: createdRepoRecoveryDetails(targetRepo),
      });
    }
    throw error;
  }
}
