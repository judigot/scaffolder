import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';
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
import { detectUserEnvInStructure } from '@/utils/project-builder/utils/detectUserEnvUsage.ts';
import type { IAgentScaffoldRequest } from '@/schemas/agentScaffold.ts';
import {
  ensureScaffolderBranchName,
  isProtectedBranchName,
  parseProjectReference,
  parseTargetRepo,
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
  readonly status: 400 | 403 | 500;
  readonly code: string;
  readonly details?: unknown;
  readonly installationUrl?: string;

  constructor(
    message: string,
    options: {
      status: 400 | 403 | 500;
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
}

export interface IAgentScaffoldServiceDependencies {
  loadUserFiles?: () => IStructure;
  buildProject?: (
    projectYamlPath: string,
    userFiles: IStructure,
    schemaInfo: ISchemaInfo[],
    formData: IFormStore,
  ) => Promise<IBuildProjectFilesResult>;
  publish?: (
    params: IPublishDraftPullRequestParams,
  ) => Promise<IDraftPullRequestResult>;
  randomId?: () => string;
}

function createAgentFormData(projectName: string): IFormStore {
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
    publicRepoURL: 'https://github.com/judigot/scaffolder-files',
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

export async function scaffoldToPullRequest(
  request: IAgentScaffoldRequest,
  dependencies: IAgentScaffoldServiceDependencies = {},
): Promise<IAgentScaffoldResult> {
  let projectReference: IParsedProjectReference;
  let targetRepo: IParsedTargetRepo;
  try {
    projectReference = parseProjectReference(request.project);
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
  const loadUserFiles =
    dependencies.loadUserFiles ??
    (() => convertLocalFilesToIStructure('files'));
  const userFiles = loadUserFiles();
  const projects = getAllProjects(userFiles);
  const project = projects.find(
    (item) => item.name === projectReference.projectName,
  );

  if (project === undefined) {
    throw new AgentScaffoldError(
      `Project "${projectReference.projectName}" was not found in scaffolder files`,
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
  const requestedBranch =
    request.branch === undefined
      ? toScaffolderBranchName(project.name, randomId())
      : ensureScaffolderBranchName(request.branch);
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

  const buildProject = dependencies.buildProject ?? buildProjectFiles;
  const buildResult = await buildProject(
    projectReference.projectYamlPath,
    userFiles,
    schemaInfo,
    createAgentFormData(project.name),
  );

  if (buildResult.hasErrors === true) {
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

  const draft = request.draft !== false;
  const prTitle = request.prTitle ?? `Scaffold ${project.name} from schemaInfo`;
  const prBody =
    request.prBody ??
    [
      'Draft pull request generated by Scaffolder.',
      '',
      `- Project: \`${project.name}\``,
      `- Tables: ${schemaInfo.map((table) => table.tableName).join(', ')}`,
      '',
      'Review the generated files before merging. This branch was not written to the default branch.',
    ].join('\n');

  const publish = dependencies.publish ?? publishDraftPullRequest;

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
    });

    return {
      ...published,
      projectName: project.name,
      targetRepo: `${targetRepo.owner}/${targetRepo.repo}`,
      tables: schemaInfo.map((table) => table.tableName),
    };
  } catch (error: unknown) {
    if (error instanceof GitHubDraftPullRequestError) {
      throw new AgentScaffoldError(error.message, {
        status: error.status,
        code: error.code,
        installationUrl: error.installationUrl,
      });
    }
    throw error;
  }
}
