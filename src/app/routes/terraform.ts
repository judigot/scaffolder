import { Hono } from 'hono';
import { validateAwsCredentials } from '@/app/services/awsCredentialValidator.ts';
import {
  bundleTerraformTemplate,
  getTemplatePath,
} from '@/app/services/terraformBundler.ts';

interface IVariableInput {
  key: unknown;
  value: unknown;
  category?: unknown;
  sensitive?: unknown;
}

function isVariableInput(v: unknown): v is IVariableInput {
  return typeof v === 'object' && v !== null && 'key' in v && 'value' in v;
}

import {
  createConfigurationVersion,
  createTerraformBaseConfig,
  createTerraformConfigFromCredentials,
  createTerraformRun,
  createTerraformWorkspace,
  createTerraformWorkspaceWithVcs,
  deleteTerraformWorkspace,
  getGitHubConnection,
  getTerraformOutputs,
  getTerraformRun,
  getTerraformState,
  getTerraformWorkspaceDetails,
  getTerraformWorkspaceId,
  getTerraformWorkspaceVariables,
  type ITerraformConfig,
  listTerraformWorkspaces,
  renameTerraformWorkspace,
  uploadConfigurationTar,
  upsertTerraformVariables,
  validateTerraformConfig,
  waitForConfigurationReady,
} from '@/app/services/terraformCloudService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

interface ITerraformRunPayload {
  enableEc2?: unknown;
  awsAccessKeyId?: unknown;
  awsSecretAccessKey?: unknown;
  awsSessionToken?: unknown;
  sshPublicKey?: unknown;
  tfcToken?: unknown;
  tfcOrg?: unknown;
  tfcWorkspace?: unknown;
  customAmi?: unknown;
}

interface ITerraformStatusPayload {
  tfcToken?: unknown;
  tfcOrg?: unknown;
  tfcWorkspace?: unknown;
  autoCreate?: unknown;
  awsAccessKeyId?: unknown;
  awsSecretAccessKey?: unknown;
  awsSessionToken?: unknown;
  sshPublicKey?: unknown;
}

interface ITerraformRunIdPayload {
  tfcToken?: unknown;
  tfcOrg?: unknown;
  tfcWorkspace?: unknown;
}

interface ICreateWorkspacePayload {
  tfcToken?: unknown;
  tfcOrg?: unknown;
  workspaceName?: unknown;
  mode?: unknown;
  awsRegion?: unknown;
  diskSize?: unknown;
  ec2InstanceType?: unknown;
  customAmi?: unknown;
  enableRds?: unknown;
  rdsInstanceClass?: unknown;
  dbEngine?: unknown;
  githubOrg?: unknown;
}

const extractTfcConfig = (body: {
  tfcToken?: unknown;
  tfcOrg?: unknown;
  tfcWorkspace?: unknown;
}): ITerraformConfig | null => {
  if (
    typeof body.tfcToken !== 'string' ||
    typeof body.tfcOrg !== 'string' ||
    typeof body.tfcWorkspace !== 'string'
  ) {
    return null;
  }
  return createTerraformConfigFromCredentials({
    tfcToken: body.tfcToken,
    tfcOrg: body.tfcOrg,
    tfcWorkspace: body.tfcWorkspace,
  });
};

const TERMINAL_RUN_STATUSES = new Set([
  'applied',
  'planned_and_finished',
  'errored',
  'canceled',
  'discarded',
  'failed',
]);

const AUTO_REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000;
const AUTO_REFRESH_TIMEOUT_MS = 90 * 1000;
const AUTO_REFRESH_POLL_MS = 4 * 1000;

interface IWorkspaceAutoRefreshState {
  lastCompletedAt: number;
  inFlight: Promise<void> | null;
}

const workspaceAutoRefreshState = new Map<string, IWorkspaceAutoRefreshState>();

const getWorkspaceRefreshKey = (config: ITerraformConfig): string => {
  return `${config.organization}/${config.workspace}`;
};

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const waitForTerraformRunCompletion = async (
  config: ITerraformConfig,
  runId: string,
  timeoutMs: number,
): Promise<void> => {
  const timeoutAt = Date.now() + timeoutMs;

  while (Date.now() < timeoutAt) {
    const run = await getTerraformRun(config, runId);
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      if (run.status === 'applied' || run.status === 'planned_and_finished') {
        return;
      }
      throw new Error(
        run.errorMessage ??
          `Terraform refresh run ended with status "${run.status}".`,
      );
    }
    await sleep(AUTO_REFRESH_POLL_MS);
  }

  throw new Error('Timed out waiting for Terraform refresh run to complete.');
};

const autoRefreshWorkspaceState = async (
  config: ITerraformConfig,
): Promise<void> => {
  const key = getWorkspaceRefreshKey(config);
  const current = workspaceAutoRefreshState.get(key) ?? {
    lastCompletedAt: 0,
    inFlight: null,
  };

  if (Date.now() - current.lastCompletedAt < AUTO_REFRESH_MIN_INTERVAL_MS) {
    return;
  }

  if (current.inFlight !== null) {
    await current.inFlight;
    return;
  }

  const refreshPromise = (async () => {
    try {
      const run = await createTerraformRun(
        config,
        'Automatic state refresh for latest outputs',
        {
          autoApply: true,
          refreshOnly: true,
        },
      );
      await waitForTerraformRunCompletion(
        config,
        run.id,
        AUTO_REFRESH_TIMEOUT_MS,
      );
      const next = workspaceAutoRefreshState.get(key) ?? {
        lastCompletedAt: 0,
        inFlight: null,
      };
      next.lastCompletedAt = Date.now();
      workspaceAutoRefreshState.set(key, next);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('A run is already in progress')
      ) {
        return;
      }
      throw error;
    } finally {
      const next = workspaceAutoRefreshState.get(key) ?? {
        lastCompletedAt: 0,
        inFlight: null,
      };
      next.inFlight = null;
      workspaceAutoRefreshState.set(key, next);
    }
  })();

  workspaceAutoRefreshState.set(key, {
    ...current,
    inFlight: refreshPromise,
  });

  await refreshPromise;
};

const router = new Hono();

router.post('/status', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const body = await c.req.json<ITerraformStatusPayload>();
  const config = extractTfcConfig(body);

  if (config === null) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message:
          'tfcToken, tfcOrg, and tfcWorkspace are required. Add them in your profile.',
      },
      400,
    );
  }

  const autoCreate = body.autoCreate === true;

  try {
    validateTerraformConfig(config);

    try {
      await getTerraformWorkspaceId(config);
    } catch (workspaceError: unknown) {
      const isNotFound =
        workspaceError instanceof Error &&
        workspaceError.message.includes('not found');

      if (isNotFound && autoCreate) {
        const hasAwsCreds =
          typeof body.awsAccessKeyId === 'string' &&
          body.awsAccessKeyId.trim() !== '' &&
          typeof body.awsSecretAccessKey === 'string' &&
          body.awsSecretAccessKey.trim() !== '';

        if (!hasAwsCreds) {
          throw new Error(
            'AWS credentials required to auto-create workspace. Add them in your profile.',
          );
        }

        const baseConfig = createTerraformBaseConfig({
          tfcToken: config.token,
          tfcOrg: config.organization,
        });
        const workspace = await createTerraformWorkspace(
          baseConfig,
          config.workspace,
          { autoApply: false },
        );

        // Type narrowing already done above - values are strings
        const awsAccessKeyId = String(body.awsAccessKeyId);
        const awsSecretAccessKey = String(body.awsSecretAccessKey);
        const awsVariables = [
          {
            key: 'AWS_ACCESS_KEY_ID',
            value: awsAccessKeyId,
            category: 'env' as const,
            sensitive: true,
          },
          {
            key: 'AWS_SECRET_ACCESS_KEY',
            value: awsSecretAccessKey,
            category: 'env' as const,
            sensitive: true,
          },
          {
            key: 'TF_VAR_enable_ec2',
            value: 'false',
            category: 'env' as const,
            sensitive: false,
          },
        ];

        if (
          typeof body.awsSessionToken === 'string' &&
          body.awsSessionToken.trim() !== ''
        ) {
          awsVariables.push({
            key: 'AWS_SESSION_TOKEN',
            value: body.awsSessionToken,
            category: 'env' as const,
            sensitive: true,
          });
        }

        if (
          typeof body.sshPublicKey === 'string' &&
          body.sshPublicKey.trim() !== ''
        ) {
          awsVariables.push({
            key: 'TF_VAR_ssh_public_key',
            value: body.sshPublicKey,
            category: 'env' as const,
            sensitive: true,
          });
        }

        await upsertTerraformVariables(config, awsVariables);

        const templatePath = getTemplatePath('ubuntu-ec2');
        const tarGzBuffer = bundleTerraformTemplate(templatePath);
        const configVersion = await createConfigurationVersion(
          baseConfig,
          workspace.id,
          false,
        );
        await uploadConfigurationTar(configVersion.uploadUrl, tarGzBuffer);
        await waitForConfigurationReady(baseConfig, configVersion.id);
      } else {
        throw workspaceError;
      }
    }

    const variables = await getTerraformWorkspaceVariables(config);
    const enableVar = variables.find(
      (item) => item.category === 'env' && item.key === 'TF_VAR_enable_ec2',
    );
    const customAmiVar = variables.find(
      (item) => item.category === 'env' && item.key === 'TF_VAR_custom_ami',
    );
    const enableEc2 = enableVar?.value === 'true';
    let autoRefreshError: string | null = null;

    if (enableEc2) {
      try {
        await autoRefreshWorkspaceState(config);
      } catch (error: unknown) {
        autoRefreshError =
          error instanceof Error
            ? error.message
            : 'Automatic Terraform refresh failed';
      }
    }

    const outputs = await getTerraformOutputs(config);

    return c.json(
      {
        success: true,
        enableEc2,
        customAmi: customAmiVar?.value ?? null,
        outputs,
        autoRefreshError,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to fetch Terraform status',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to fetch Terraform status',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/workspaces', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const body = await c.req.json<{ tfcToken?: unknown; tfcOrg?: unknown }>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  try {
    const baseConfig = createTerraformBaseConfig({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
    });

    const workspaces = await listTerraformWorkspaces(baseConfig);

    return c.json(
      {
        success: true,
        workspaces,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      const status =
        error.message.includes('invalid or expired') ||
        error.message.includes('lacks permission')
          ? 403
          : error.message.includes('not found')
            ? 404
            : 500;
      return c.json(
        {
          error: 'Failed to fetch workspaces',
          message: error.message,
        },
        status,
      );
    }
    return c.json(
      {
        error: 'Failed to fetch workspaces',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/run', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const body = await c.req.json<ITerraformRunPayload>();

  const config = extractTfcConfig(body);

  if (config === null) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message:
          'tfcToken, tfcOrg, and tfcWorkspace are required. Add them in your profile.',
      },
      400,
    );
  }

  if (typeof body.enableEc2 !== 'boolean') {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'enableEc2 must be a boolean.',
      },
      400,
    );
  }

  if (
    typeof body.awsAccessKeyId !== 'string' ||
    typeof body.awsSecretAccessKey !== 'string' ||
    typeof body.sshPublicKey !== 'string'
  ) {
    return c.json(
      {
        error: 'Invalid payload',
        message:
          'awsAccessKeyId, awsSecretAccessKey, and sshPublicKey are required.',
      },
      400,
    );
  }

  try {
    validateTerraformConfig(config);

    const awsValidation = await validateAwsCredentials({
      accessKeyId: body.awsAccessKeyId,
      secretAccessKey: body.awsSecretAccessKey,
      sessionToken:
        typeof body.awsSessionToken === 'string' &&
        body.awsSessionToken.trim() !== ''
          ? body.awsSessionToken
          : undefined,
    });

    if (!awsValidation.valid) {
      return c.json(
        {
          error: 'Invalid AWS credentials',
          message:
            awsValidation.error ??
            'AWS credentials are invalid. Update them in your profile.',
        },
        422,
      );
    }

    const baseConfig = createTerraformBaseConfig({
      tfcToken: config.token,
      tfcOrg: config.organization,
    });

    const workspaceDetails = await getTerraformWorkspaceDetails(
      baseConfig,
      config.workspace,
    );
    if (!workspaceDetails) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    const workspaceId = workspaceDetails.id;

    if (body.enableEc2 && !workspaceDetails.isVcsConnected) {
      const templatePath = getTemplatePath('ubuntu-ec2');
      const tarGzBuffer = bundleTerraformTemplate(templatePath);
      const configVersion = await createConfigurationVersion(
        baseConfig,
        workspaceId,
        false,
      );
      await uploadConfigurationTar(configVersion.uploadUrl, tarGzBuffer);
      await waitForConfigurationReady(baseConfig, configVersion.id);
    }

    const variables = [
      {
        key: 'AWS_ACCESS_KEY_ID',
        value: body.awsAccessKeyId,
        category: 'env' as const,
        sensitive: true,
      },
      {
        key: 'AWS_SECRET_ACCESS_KEY',
        value: body.awsSecretAccessKey,
        category: 'env' as const,
        sensitive: true,
      },
      {
        key: 'TF_VAR_ssh_public_key',
        value: body.sshPublicKey,
        category: 'env' as const,
        sensitive: true,
      },
      {
        key: 'TF_VAR_enable_ec2',
        value: body.enableEc2 ? 'true' : 'false',
        category: 'env' as const,
        sensitive: false,
      },
    ];

    if (typeof body.customAmi === 'string') {
      const trimmedAmi = body.customAmi.trim();
      if (trimmedAmi !== '') {
        variables.push({
          key: 'TF_VAR_custom_ami',
          value: trimmedAmi,
          category: 'env' as const,
          sensitive: false,
        });
      }
    }

    variables.push({
      key: 'AWS_SESSION_TOKEN',
      value:
        typeof body.awsSessionToken === 'string' &&
        body.awsSessionToken.trim() !== ''
          ? body.awsSessionToken
          : '',
      category: 'env' as const,
      sensitive: true,
    });

    await upsertTerraformVariables(config, variables);
    const run = await createTerraformRun(
      config,
      `App toggle: enable_ec2 ${body.enableEc2 ? 'true' : 'false'}`,
    );

    return c.json(
      {
        success: true,
        run,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to trigger Terraform run',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to trigger Terraform run',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/run/:runId', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const runId = c.req.param('runId');
  if (runId === '') {
    return c.json(
      {
        error: 'Run ID is required',
      },
      400,
    );
  }

  const body = await c.req.json<ITerraformRunIdPayload>();
  const config = extractTfcConfig(body);

  if (config === null) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken, tfcOrg, and tfcWorkspace are required.',
      },
      400,
    );
  }

  try {
    const run = await getTerraformRun(config, runId);
    return c.json(
      {
        success: true,
        run,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to fetch Terraform run',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to fetch Terraform run',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

interface IUpdateWorkspaceConfigPayload {
  tfcToken?: unknown;
  tfcOrg?: unknown;
  ec2InstanceType?: unknown;
  diskSize?: unknown;
  enableRds?: unknown;
  rdsInstanceClass?: unknown;
  customAmi?: unknown;
  renameTo?: unknown;
  dbEngine?: unknown;
  awsRegion?: unknown;
  enableEc2?: unknown;
}

router.post('/workspace/:workspaceName/config', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const workspaceName = c.req.param('workspaceName');
  if (workspaceName === '') {
    return c.json({ error: 'Workspace name is required' }, 400);
  }

  const body = await c.req.json<IUpdateWorkspaceConfigPayload>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  let config = createTerraformConfigFromCredentials({
    tfcToken: body.tfcToken,
    tfcOrg: body.tfcOrg,
    tfcWorkspace: workspaceName,
  });
  const renameTo =
    typeof body.renameTo === 'string' ? body.renameTo.trim() : '';
  const wantsRename = renameTo !== '' && renameTo !== workspaceName;

  try {
    if (wantsRename) {
      await renameTerraformWorkspace(config, renameTo);
      config = createTerraformConfigFromCredentials({
        tfcToken: body.tfcToken,
        tfcOrg: body.tfcOrg,
        tfcWorkspace: renameTo,
      });
    }

    validateTerraformConfig(config);
    await getTerraformWorkspaceId(config);

    const variables: {
      key: string;
      value: string;
      category: 'env' | 'terraform';
      sensitive: boolean;
    }[] = [];

    if (
      typeof body.ec2InstanceType === 'string' &&
      body.ec2InstanceType !== ''
    ) {
      variables.push({
        key: 'TF_VAR_instance_type',
        value: body.ec2InstanceType,
        category: 'env',
        sensitive: false,
      });
    }

    if (typeof body.diskSize === 'number' && body.diskSize >= 10) {
      variables.push({
        key: 'TF_VAR_disk_size',
        value: String(body.diskSize),
        category: 'env',
        sensitive: false,
      });
    }

    if (typeof body.enableRds === 'boolean') {
      variables.push({
        key: 'TF_VAR_enable_rds',
        value: body.enableRds ? 'true' : 'false',
        category: 'env',
        sensitive: false,
      });
    }

    if (typeof body.dbEngine === 'string') {
      const dbEngine = body.dbEngine.trim();
      if (dbEngine === 'postgresql' || dbEngine === 'mysql') {
        variables.push({
          key: 'TF_VAR_db_engine',
          value: dbEngine,
          category: 'env',
          sensitive: false,
        });
      }
    }

    if (typeof body.customAmi === 'string') {
      variables.push({
        key: 'TF_VAR_custom_ami',
        value: body.customAmi,
        category: 'env',
        sensitive: false,
      });
    }

    if (
      typeof body.rdsInstanceClass === 'string' &&
      body.rdsInstanceClass !== ''
    ) {
      variables.push({
        key: 'TF_VAR_db_instance_class',
        value: body.rdsInstanceClass,
        category: 'env',
        sensitive: false,
      });
    }

    if (typeof body.awsRegion === 'string' && body.awsRegion !== '') {
      variables.push({
        key: 'TF_VAR_aws_region',
        value: body.awsRegion,
        category: 'env',
        sensitive: false,
      });
    }

    if (variables.length === 0 && !wantsRename) {
      return c.json(
        {
          error: 'No configuration changes provided',
          message:
            'Provide at least one of: awsRegion, ec2InstanceType, diskSize, enableRds, dbEngine, customAmi, renameTo, rdsInstanceClass',
        },
        400,
      );
    }

    await upsertTerraformVariables(config, variables);

    const isEc2Running = body.enableEc2 === true;

    if (isEc2Running) {
      const changeDescriptions = variables
        .map((v) => `${v.key}=${v.value}`)
        .join(', ');
      const run = await createTerraformRun(
        config,
        `Config update: ${changeDescriptions}`,
      );

      return c.json(
        {
          success: true,
          run,
          updatedVariables: variables.map((v) => v.key),
        },
        200,
      );
    }

    return c.json(
      {
        success: true,
        run: null,
        updatedVariables: variables.map((v) => v.key),
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to update workspace configuration',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to update workspace configuration',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/workspace', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const body = await c.req.json<ICreateWorkspacePayload>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  if (
    typeof body.workspaceName !== 'string' ||
    body.workspaceName.trim() === ''
  ) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'workspaceName is required.',
      },
      400,
    );
  }

  const mode = body.mode === 'vcs' ? 'vcs' : 'api';

  if (
    mode === 'vcs' &&
    (typeof body.githubOrg !== 'string' || body.githubOrg.trim() === '')
  ) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'githubOrg is required for VCS-connected workspaces.',
      },
      400,
    );
  }

  if (
    mode === 'api' &&
    (typeof body.awsRegion !== 'string' || body.awsRegion.trim() === '')
  ) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'awsRegion is required for API mode workspaces.',
      },
      400,
    );
  }

  if (
    mode === 'api' &&
    (typeof body.diskSize !== 'number' ||
      !Number.isFinite(body.diskSize) ||
      body.diskSize < 10 ||
      body.diskSize > 500)
  ) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'diskSize must be a number between 10 and 500 for API mode.',
      },
      400,
    );
  }

  try {
    const baseConfig = createTerraformBaseConfig({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
    });

    let workspace: { id: string; name: string };

    if (mode === 'vcs') {
      // Type narrowing already done above - githubOrg is string
      const githubOrgTrimmed = String(body.githubOrg).trim();
      const connection = await getGitHubConnection(
        baseConfig,
        githubOrgTrimmed,
      );
      if (connection === null) {
        return c.json(
          {
            error: 'No GitHub connection',
            message: `No GitHub App installation or OAuth connection found for "${githubOrgTrimmed}". Install the Terraform Cloud GitHub App for this organization/user, or set up an OAuth connection in TFC settings.`,
          },
          422,
        );
      }

      const repoIdentifier = `${githubOrgTrimmed}/${body.workspaceName.trim()}`;
      workspace = await createTerraformWorkspaceWithVcs(
        baseConfig,
        body.workspaceName.trim(),
        {
          identifier: repoIdentifier,
          connection,
        },
        { autoApply: true },
      );
    } else {
      workspace = await createTerraformWorkspace(
        baseConfig,
        body.workspaceName.trim(),
        { autoApply: true },
      );

      const workspaceConfig = createTerraformConfigFromCredentials({
        tfcToken: body.tfcToken,
        tfcOrg: body.tfcOrg,
        tfcWorkspace: workspace.name,
      });

      const initialVariables: {
        key: string;
        value: string;
        category: 'env' | 'terraform';
        sensitive: boolean;
      }[] = [];

      if (
        typeof body.ec2InstanceType === 'string' &&
        body.ec2InstanceType.trim() !== ''
      ) {
        initialVariables.push({
          key: 'TF_VAR_instance_type',
          value: body.ec2InstanceType.trim(),
          category: 'env',
          sensitive: false,
        });
      }

      if (typeof body.awsRegion === 'string' && body.awsRegion.trim() !== '') {
        initialVariables.push({
          key: 'TF_VAR_aws_region',
          value: body.awsRegion.trim(),
          category: 'env',
          sensitive: false,
        });
      }

      if (
        typeof body.diskSize === 'number' &&
        Number.isFinite(body.diskSize) &&
        body.diskSize >= 10 &&
        body.diskSize <= 500
      ) {
        initialVariables.push({
          key: 'TF_VAR_disk_size',
          value: String(body.diskSize),
          category: 'env',
          sensitive: false,
        });
      }

      if (typeof body.enableRds === 'boolean') {
        initialVariables.push({
          key: 'TF_VAR_enable_rds',
          value: body.enableRds ? 'true' : 'false',
          category: 'env',
          sensitive: false,
        });
      }

      if (
        typeof body.rdsInstanceClass === 'string' &&
        body.rdsInstanceClass.trim() !== ''
      ) {
        initialVariables.push({
          key: 'TF_VAR_db_instance_class',
          value: body.rdsInstanceClass.trim(),
          category: 'env',
          sensitive: false,
        });
      }

      if (typeof body.dbEngine === 'string') {
        const dbEngine = body.dbEngine.trim();
        if (dbEngine === 'postgresql' || dbEngine === 'mysql') {
          initialVariables.push({
            key: 'TF_VAR_db_engine',
            value: dbEngine,
            category: 'env',
            sensitive: false,
          });
        }
      }

      if (typeof body.customAmi === 'string' && body.customAmi.trim() !== '') {
        initialVariables.push({
          key: 'TF_VAR_custom_ami',
          value: body.customAmi.trim(),
          category: 'env',
          sensitive: false,
        });
      }

      if (initialVariables.length > 0) {
        await upsertTerraformVariables(workspaceConfig, initialVariables);
      }

      const templatePath = getTemplatePath('ubuntu-ec2');
      const tarGzBuffer = bundleTerraformTemplate(templatePath);
      const configVersion = await createConfigurationVersion(
        baseConfig,
        workspace.id,
        false,
      );
      await uploadConfigurationTar(configVersion.uploadUrl, tarGzBuffer);
      await waitForConfigurationReady(baseConfig, configVersion.id);
    }

    return c.json(
      {
        success: true,
        workspace,
        mode,
        ec2InstanceType:
          typeof body.ec2InstanceType === 'string'
            ? body.ec2InstanceType
            : null,
        rdsInstanceClass:
          typeof body.rdsInstanceClass === 'string'
            ? body.rdsInstanceClass
            : null,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      const status =
        error.message.includes('invalid or expired') ||
        error.message.includes('lacks permission')
          ? 403
          : error.message.includes('not found')
            ? 404
            : 500;
      return c.json(
        {
          error: 'Failed to create workspace',
          message: error.message,
        },
        status,
      );
    }
    return c.json(
      {
        error: 'Failed to create workspace',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/workspace/:workspaceName/variables', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const workspaceName = c.req.param('workspaceName');
  if (workspaceName === '') {
    return c.json(
      {
        error: 'Workspace name is required',
      },
      400,
    );
  }

  const body = await c.req.json<{ tfcToken?: unknown; tfcOrg?: unknown }>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  try {
    const config = createTerraformConfigFromCredentials({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
      tfcWorkspace: workspaceName,
    });

    const variables = await getTerraformWorkspaceVariables(config);

    return c.json(
      {
        success: true,
        variables: variables.map((v) => ({
          id: v.id,
          key: v.key,
          value: v.sensitive ? null : v.value,
          category: v.category,
          sensitive: v.sensitive,
        })),
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to fetch workspace variables',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to fetch workspace variables',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.post('/workspace/:workspaceName/state', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const workspaceName = c.req.param('workspaceName');
  if (workspaceName === '') {
    return c.json({ error: 'Workspace name is required' }, 400);
  }

  const body = await c.req.json<{ tfcToken?: unknown; tfcOrg?: unknown }>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  try {
    const config = createTerraformConfigFromCredentials({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
      tfcWorkspace: workspaceName,
    });

    const state = await getTerraformState(config);

    return c.json({ success: true, state }, 200);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to fetch workspace state',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to fetch workspace state',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.put('/workspace/:workspaceName/variables', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const workspaceName = c.req.param('workspaceName');
  if (workspaceName === '') {
    return c.json(
      {
        error: 'Workspace name is required',
      },
      400,
    );
  }

  const body = await c.req.json<{
    tfcToken?: unknown;
    tfcOrg?: unknown;
    variables?: unknown;
  }>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  if (!Array.isArray(body.variables)) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'variables must be an array.',
      },
      400,
    );
  }

  const variableInputs: {
    key: string;
    value: string;
    category: 'env' | 'terraform';
    sensitive: boolean;
  }[] = [];

  for (const v of body.variables) {
    if (!isVariableInput(v)) {
      continue;
    }
    const key = v.key;
    const value = v.value;
    if (typeof key !== 'string' || typeof value !== 'string') {
      continue;
    }
    const category = v.category === 'terraform' ? 'terraform' : 'env';
    const sensitive = Boolean(v.sensitive);
    variableInputs.push({
      key,
      value,
      category,
      sensitive,
    });
  }

  if (variableInputs.length === 0) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'No valid variables provided.',
      },
      400,
    );
  }

  try {
    const config = createTerraformConfigFromCredentials({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
      tfcWorkspace: workspaceName,
    });

    await upsertTerraformVariables(config, variableInputs);

    return c.json(
      {
        success: true,
        updated: variableInputs.length,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to update workspace variables',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to update workspace variables',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

router.delete('/workspace/:workspaceName', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const workspaceName = c.req.param('workspaceName');
  if (workspaceName === '') {
    return c.json(
      {
        error: 'Workspace name is required',
      },
      400,
    );
  }

  const body = await c.req.json<{ tfcToken?: unknown; tfcOrg?: unknown }>();

  if (
    typeof body.tfcToken !== 'string' ||
    body.tfcToken.trim() === '' ||
    typeof body.tfcOrg !== 'string' ||
    body.tfcOrg.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing Terraform Cloud credentials',
        message: 'tfcToken and tfcOrg are required.',
      },
      400,
    );
  }

  try {
    const baseConfig = createTerraformBaseConfig({
      tfcToken: body.tfcToken,
      tfcOrg: body.tfcOrg,
    });

    await deleteTerraformWorkspace(baseConfig, workspaceName);

    return c.json(
      {
        success: true,
        deleted: workspaceName,
      },
      200,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      const status =
        error.message.includes('invalid or expired') ||
        error.message.includes('lacks permission')
          ? 403
          : error.message.includes('not found')
            ? 404
            : 500;
      return c.json(
        {
          error: 'Failed to delete workspace',
          message: error.message,
        },
        status,
      );
    }
    return c.json(
      {
        error: 'Failed to delete workspace',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

export default router;
