export interface ITerraformConfig {
  apiBaseUrl: string;
  token: string;
  organization: string;
  workspace: string;
}

interface ITerraformVariableInput {
  key: string;
  value: string;
  category: 'env' | 'terraform';
  sensitive: boolean;
}

interface ITerraformVariable {
  id: string;
  key: string;
  category: 'env' | 'terraform';
  value?: string | null;
  sensitive: boolean;
}

interface ITerraformRunResult {
  id: string;
  status: string;
}

export interface ITerraformWorkspace {
  id: string;
  name: string;
}

export interface ITerraformWorkspaceDetails extends ITerraformWorkspace {
  isVcsConnected: boolean;
  vcsRepo: {
    identifier: string;
    branch: string;
  } | null;
}

export interface ICreateWorkspaceOptions {
  executionMode?: 'remote' | 'local' | 'agent';
  autoApply?: boolean;
  terraformVersion?: string;
}

interface IConfigurationVersion {
  id: string;
  uploadUrl: string;
}

type ITerraformBaseConfig = Omit<ITerraformConfig, 'workspace'>;

// Type guards and helper interfaces for API responses
interface ITerraformApiError {
  detail?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiError(item: unknown): item is ITerraformApiError {
  return isRecord(item) && 'detail' in item && typeof item.detail === 'string';
}

function extractFirstErrorDetail(errorBody: unknown): string | null {
  if (!isRecord(errorBody)) {
    return null;
  }
  if (!('errors' in errorBody) || !Array.isArray(errorBody.errors)) {
    return null;
  }
  if (errorBody.errors.length === 0) {
    return null;
  }
  const firstError: unknown = errorBody.errors[0];
  if (isApiError(firstError)) {
    return firstError.detail ?? null;
  }
  return null;
}

const TFC_API_BASE_URL = 'https://app.terraform.io/api/v2';

const terraformBaseFetch = async (
  config: ITerraformBaseConfig,
  path: string,
  options?: RequestInit,
): Promise<Response> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/vnd.api+json',
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  return fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
};

const terraformFetch = async (
  config: ITerraformConfig,
  path: string,
  options?: RequestInit,
): Promise<Response> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/vnd.api+json',
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  return fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
};

export const validateTerraformConfig = (config: ITerraformConfig): void => {
  if (!config.token || config.token.trim() === '') {
    throw new Error('Terraform Cloud token is missing');
  }
  if (!config.organization || config.organization.trim() === '') {
    throw new Error('Terraform Cloud organization is missing');
  }
  if (!config.workspace || config.workspace.trim() === '') {
    throw new Error('Terraform Cloud workspace is missing');
  }
};

export const createTerraformConfigFromCredentials = (creds: {
  tfcToken: string;
  tfcOrg: string;
  tfcWorkspace: string;
}): ITerraformConfig => {
  return {
    apiBaseUrl: TFC_API_BASE_URL,
    token: creds.tfcToken,
    organization: creds.tfcOrg,
    workspace: creds.tfcWorkspace,
  };
};

export const createTerraformBaseConfig = (creds: {
  tfcToken: string;
  tfcOrg: string;
}): ITerraformBaseConfig => {
  return {
    apiBaseUrl: TFC_API_BASE_URL,
    token: creds.tfcToken,
    organization: creds.tfcOrg,
  };
};

export const getTerraformWorkspaceId = async (
  config: ITerraformConfig,
): Promise<string> => {
  const response = await terraformFetch(
    config,
    `/organizations/${config.organization}/workspaces/${config.workspace}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Workspace "${config.workspace}" not found in organization "${config.organization}"`,
      );
    }
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    throw new Error('Failed to fetch Terraform workspace');
  }

  const data: unknown = await response.json();
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof data.data === 'object' &&
    data.data !== null &&
    'id' in data.data &&
    typeof data.data.id === 'string'
  ) {
    return data.data.id;
  }

  throw new Error('Terraform workspace response missing ID');
};

export const getTerraformWorkspaceVariables = async (
  config: ITerraformConfig,
): Promise<ITerraformVariable[]> => {
  const workspaceId = await getTerraformWorkspaceId(config);
  const response = await terraformFetch(
    config,
    `/workspaces/${workspaceId}/vars`,
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Terraform workspace variables');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  const variables: ITerraformVariable[] = [];
  for (const item of payload.data) {
    if (!isRecord(item) || !('id' in item) || !('attributes' in item)) {
      continue;
    }
    const itemId = item.id;
    const rawAttributes = item.attributes;
    if (!isRecord(rawAttributes)) {
      continue;
    }

    const key =
      'key' in rawAttributes && typeof rawAttributes.key === 'string'
        ? rawAttributes.key
        : null;
    const rawCategory =
      'category' in rawAttributes ? rawAttributes.category : null;
    const category =
      rawCategory === 'env' || rawCategory === 'terraform' ? rawCategory : null;
    const sensitive =
      'sensitive' in rawAttributes &&
      typeof rawAttributes.sensitive === 'boolean'
        ? rawAttributes.sensitive
        : false;
    const value =
      'value' in rawAttributes && typeof rawAttributes.value === 'string'
        ? rawAttributes.value
        : null;
    if (key === null || category === null) {
      continue;
    }
    variables.push({
      id: typeof itemId === 'string' ? itemId : '',
      key,
      category,
      sensitive,
      value,
    });
  }

  return variables;
};

export const upsertTerraformVariables = async (
  config: ITerraformConfig,
  variables: ITerraformVariableInput[],
): Promise<void> => {
  const workspaceId = await getTerraformWorkspaceId(config);
  const existing = await getTerraformWorkspaceVariables(config);
  const existingMap = new Map<string, ITerraformVariable>();
  for (const item of existing) {
    existingMap.set(`${item.category}:${item.key}`, item);
  }

  for (const variable of variables) {
    const existingVar = existingMap.get(`${variable.category}:${variable.key}`);

    if (existingVar) {
      const response = await terraformFetch(config, `/vars/${existingVar.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            id: existingVar.id,
            type: 'vars',
            attributes: {
              value: variable.value,
              sensitive: variable.sensitive,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update Terraform variable ${variable.key}`);
      }
    } else {
      const response = await terraformFetch(
        config,
        `/workspaces/${workspaceId}/vars`,
        {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'vars',
              attributes: {
                key: variable.key,
                value: variable.value,
                category: variable.category,
                sensitive: variable.sensitive,
                hcl: false,
              },
              relationships: {
                workspace: {
                  data: {
                    id: workspaceId,
                    type: 'workspaces',
                  },
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create Terraform variable ${variable.key}`);
      }
    }
  }
};

export const createTerraformRun = async (
  config: ITerraformConfig,
  message: string,
): Promise<ITerraformRunResult> => {
  const workspaceId = await getTerraformWorkspaceId(config);
  const response = await terraformFetch(config, '/runs', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'runs',
        attributes: {
          message,
          'auto-apply': true,
        },
        relationships: {
          workspace: {
            data: {
              id: workspaceId,
              type: 'workspaces',
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        'A run is already in progress. Wait for it to complete before starting a new one.',
      );
    }
    const errorBody: unknown = await response.json().catch(() => null);
    if (response.status === 422) {
      const detail = extractFirstErrorDetail(errorBody);
      if (detail !== null) {
        throw new Error(detail);
      }
      throw new Error(
        'Workspace has no Terraform configuration. Upload configuration first.',
      );
    }
    // Try to extract error message from response
    const detail = extractFirstErrorDetail(errorBody);
    if (detail !== null) {
      throw new Error(detail);
    }
    throw new Error(
      `Failed to create Terraform run (HTTP ${String(response.status)})`,
    );
  }

  const payload: unknown = await response.json();
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    typeof payload.data === 'object' &&
    payload.data !== null &&
    'id' in payload.data &&
    typeof payload.data.id === 'string'
  ) {
    const status =
      'attributes' in payload.data &&
      typeof payload.data.attributes === 'object' &&
      payload.data.attributes !== null &&
      'status' in payload.data.attributes &&
      typeof payload.data.attributes.status === 'string'
        ? payload.data.attributes.status
        : 'queued';
    return {
      id: payload.data.id,
      status,
    };
  }

  throw new Error('Terraform run response missing ID');
};

export const getTerraformRun = async (
  config: ITerraformConfig,
  runId: string,
): Promise<ITerraformRunResult> => {
  const response = await terraformFetch(config, `/runs/${runId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch Terraform run status');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    typeof payload.data === 'object' &&
    payload.data !== null &&
    'id' in payload.data &&
    typeof payload.data.id === 'string'
  ) {
    const status =
      'attributes' in payload.data &&
      typeof payload.data.attributes === 'object' &&
      payload.data.attributes !== null &&
      'status' in payload.data.attributes &&
      typeof payload.data.attributes.status === 'string'
        ? payload.data.attributes.status
        : 'unknown';
    return {
      id: payload.data.id,
      status,
    };
  }

  throw new Error('Terraform run response missing ID');
};

export const getTerraformOutputs = async (
  config: ITerraformConfig,
): Promise<Record<string, unknown>> => {
  const workspaceId = await getTerraformWorkspaceId(config);
  const response = await terraformFetch(
    config,
    `/workspaces/${workspaceId}/current-state-version`,
  );

  if (!response.ok) {
    return {};
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null ||
    !('id' in payload.data) ||
    typeof payload.data.id !== 'string'
  ) {
    return {};
  }

  const stateVersionId = payload.data.id;
  const outputsResponse = await terraformFetch(
    config,
    `/state-versions/${stateVersionId}/outputs`,
  );
  if (!outputsResponse.ok) {
    return {};
  }

  const outputsPayload: unknown = await outputsResponse.json();
  if (
    typeof outputsPayload !== 'object' ||
    outputsPayload === null ||
    !('data' in outputsPayload) ||
    !Array.isArray(outputsPayload.data)
  ) {
    return {};
  }

  const outputs: Record<string, unknown> = {};
  for (const item of outputsPayload.data) {
    if (
      !isRecord(item) ||
      !('attributes' in item) ||
      !isRecord(item.attributes)
    ) {
      continue;
    }

    const attrs = item.attributes;
    const name =
      'name' in attrs && typeof attrs.name === 'string' ? attrs.name : null;
    const value = 'value' in attrs ? attrs.value : null;
    if (name !== null) {
      outputs[name] = value;
    }
  }

  return outputs;
};

export const getTerraformWorkspaceByName = async (
  config: ITerraformBaseConfig,
  workspaceName: string,
): Promise<ITerraformWorkspace | null> => {
  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/workspaces/${workspaceName}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to access this workspace',
      );
    }
    throw new Error('Failed to fetch Terraform workspace');
  }

  const data: unknown = await response.json();
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof data.data === 'object' &&
    data.data !== null &&
    'id' in data.data &&
    typeof data.data.id === 'string'
  ) {
    const attributes = 'attributes' in data.data ? data.data.attributes : null;
    const name =
      typeof attributes === 'object' &&
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : workspaceName;
    return { id: data.data.id, name };
  }

  throw new Error('Terraform workspace response missing ID');
};

export const getTerraformWorkspaceDetails = async (
  config: ITerraformBaseConfig,
  workspaceName: string,
): Promise<ITerraformWorkspaceDetails | null> => {
  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/workspaces/${workspaceName}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to access this workspace',
      );
    }
    throw new Error('Failed to fetch Terraform workspace');
  }

  const data: unknown = await response.json();
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof data.data === 'object' &&
    data.data !== null &&
    'id' in data.data &&
    typeof data.data.id === 'string'
  ) {
    const attributes = 'attributes' in data.data ? data.data.attributes : null;
    const name =
      typeof attributes === 'object' &&
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : workspaceName;

    const vcsRepo =
      typeof attributes === 'object' &&
      attributes !== null &&
      'vcs-repo' in attributes &&
      typeof attributes['vcs-repo'] === 'object' &&
      attributes['vcs-repo'] !== null
        ? attributes['vcs-repo']
        : null;

    const isVcsConnected = vcsRepo !== null;

    return {
      id: data.data.id,
      name,
      isVcsConnected,
      vcsRepo: isVcsConnected
        ? {
            identifier:
              'identifier' in vcsRepo && typeof vcsRepo.identifier === 'string'
                ? vcsRepo.identifier
                : '',
            branch:
              'branch' in vcsRepo && typeof vcsRepo.branch === 'string'
                ? vcsRepo.branch
                : '',
          }
        : null,
    };
  }

  throw new Error('Terraform workspace response missing ID');
};

export const createTerraformWorkspace = async (
  config: ITerraformBaseConfig,
  workspaceName: string,
  options?: ICreateWorkspaceOptions,
): Promise<ITerraformWorkspace> => {
  const existing = await getTerraformWorkspaceByName(config, workspaceName);
  if (existing !== null) {
    return existing;
  }

  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/workspaces`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'workspaces',
          attributes: {
            name: workspaceName,
            'execution-mode': options?.executionMode ?? 'remote',
            'auto-apply': options?.autoApply ?? true,
            'terraform-version': options?.terraformVersion ?? 'latest',
          },
        },
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to create workspaces',
      );
    }
    if (response.status === 404) {
      throw new Error(`Organization "${config.organization}" not found`);
    }
    if (response.status === 422) {
      const errorBody: unknown = await response.json().catch(() => null);
      const detail = extractFirstErrorDetail(errorBody);
      if (detail !== null) {
        throw new Error(detail);
      }
      throw new Error('Workspace validation failed');
    }
    throw new Error('Failed to create Terraform workspace');
  }

  const payload: unknown = await response.json();
  if (
    isRecord(payload) &&
    'data' in payload &&
    isRecord(payload.data) &&
    'id' in payload.data &&
    typeof payload.data.id === 'string'
  ) {
    const payloadDataId: string = payload.data.id;
    const attributes =
      'attributes' in payload.data && isRecord(payload.data.attributes)
        ? payload.data.attributes
        : null;
    const name =
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : workspaceName;
    return { id: payloadDataId, name };
  }

  throw new Error('Terraform workspace creation response missing ID');
};

export const renameTerraformWorkspace = async (
  config: ITerraformConfig,
  newName: string,
): Promise<void> => {
  const workspaceId = await getTerraformWorkspaceId(config);
  const response = await terraformFetch(config, `/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'workspaces',
        id: workspaceId,
        attributes: {
          name: newName,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    const detail = extractFirstErrorDetail(errorBody);
    if (detail !== null) {
      throw new Error(detail);
    }
    throw new Error('Failed to rename Terraform workspace');
  }
};

export interface ITerraformStateResource {
  address: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
}

export interface ITerraformStateData {
  resources: ITerraformStateResource[];
  ec2InstanceType?: string;
  ec2InstanceId?: string;
  region?: string;
  diskSize?: number;
  rdsInstanceClass?: string;
  rdsEnabled?: boolean;
}

export const getTerraformState = async (
  config: ITerraformConfig,
): Promise<ITerraformStateData | null> => {
  const workspaceId = await getTerraformWorkspaceId(config);

  const stateVersionResponse = await terraformFetch(
    config,
    `/workspaces/${workspaceId}/current-state-version`,
  );

  if (!stateVersionResponse.ok) {
    if (stateVersionResponse.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch current state version');
  }

  const stateVersionData: unknown = await stateVersionResponse.json();

  let jsonStateUrl: string | null = null;
  if (
    isRecord(stateVersionData) &&
    'data' in stateVersionData &&
    isRecord(stateVersionData.data) &&
    'attributes' in stateVersionData.data &&
    isRecord(stateVersionData.data.attributes)
  ) {
    const attrs = stateVersionData.data.attributes;
    if (typeof attrs['hosted-json-state-download-url'] === 'string') {
      jsonStateUrl = attrs['hosted-json-state-download-url'];
    }
  }

  if (jsonStateUrl === null) {
    return null;
  }

  const stateResponse = await fetch(jsonStateUrl, {
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!stateResponse.ok) {
    throw new Error('Failed to download state JSON');
  }

  const stateJson: unknown = await stateResponse.json();

  const result: ITerraformStateData = {
    resources: [],
  };

  if (
    !isRecord(stateJson) ||
    !('values' in stateJson) ||
    !isRecord(stateJson.values)
  ) {
    return result;
  }

  const values = stateJson.values;
  const rootModule = isRecord(values.root_module) ? values.root_module : null;

  if (rootModule === null || !Array.isArray(rootModule.resources)) {
    return result;
  }

  for (const resource of rootModule.resources) {
    if (!isRecord(resource)) {
      continue;
    }

    const type = typeof resource.type === 'string' ? resource.type : '';
    const name = typeof resource.name === 'string' ? resource.name : '';
    const address =
      typeof resource.address === 'string' ? resource.address : '';
    const attributes = isRecord(resource.values) ? resource.values : {};

    result.resources.push({ address, type, name, attributes });

    if (type === 'aws_instance') {
      if (typeof attributes.instance_type === 'string') {
        result.ec2InstanceType = attributes.instance_type;
      }
      if (typeof attributes.id === 'string') {
        result.ec2InstanceId = attributes.id;
      }
      if (typeof attributes.availability_zone === 'string') {
        const az = attributes.availability_zone;
        result.region = az.slice(0, -1);
      }
      if (
        Array.isArray(attributes.root_block_device) &&
        attributes.root_block_device.length > 0
      ) {
        const rootBlockItem: unknown = attributes.root_block_device[0];
        if (
          isRecord(rootBlockItem) &&
          typeof rootBlockItem.volume_size === 'number'
        ) {
          result.diskSize = rootBlockItem.volume_size;
        }
      }
    }

    if (type === 'aws_db_instance') {
      result.rdsEnabled = true;
      if (typeof attributes.instance_class === 'string') {
        result.rdsInstanceClass = attributes.instance_class;
      }
    }
  }

  return result;
};

export const listTerraformWorkspaces = async (
  config: ITerraformBaseConfig,
): Promise<ITerraformWorkspace[]> => {
  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/workspaces`,
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 404) {
      throw new Error(`Organization "${config.organization}" not found`);
    }
    throw new Error('Failed to fetch Terraform workspaces');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  const workspaces: ITerraformWorkspace[] = [];
  for (const item of payload.data) {
    if (!isRecord(item) || !('id' in item) || typeof item.id !== 'string') {
      continue;
    }
    const itemId: string = item.id;
    const attributes =
      'attributes' in item && isRecord(item.attributes)
        ? item.attributes
        : null;
    const name =
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : null;
    if (name !== null) {
      workspaces.push({ id: itemId, name });
    }
  }

  return workspaces;
};

export const deleteTerraformWorkspace = async (
  config: ITerraformBaseConfig,
  workspaceName: string,
): Promise<void> => {
  const workspace = await getTerraformWorkspaceByName(config, workspaceName);
  if (workspace === null) {
    return;
  }

  const response = await terraformBaseFetch(
    config,
    `/workspaces/${workspace.id}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to delete workspaces',
      );
    }
    throw new Error('Failed to delete Terraform workspace');
  }
};

export const createConfigurationVersion = async (
  config: ITerraformBaseConfig,
  workspaceId: string,
  autoQueueRuns = false,
): Promise<IConfigurationVersion> => {
  const response = await terraformBaseFetch(
    config,
    `/workspaces/${workspaceId}/configuration-versions`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'configuration-versions',
          attributes: {
            'auto-queue-runs': autoQueueRuns,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to create configuration versions',
      );
    }
    throw new Error('Failed to create configuration version');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null ||
    !('id' in payload.data) ||
    typeof payload.data.id !== 'string'
  ) {
    throw new Error('Configuration version response missing ID');
  }

  const attributes =
    'attributes' in payload.data &&
    typeof payload.data.attributes === 'object' &&
    payload.data.attributes !== null
      ? payload.data.attributes
      : null;
  const uploadUrl =
    attributes !== null &&
    'upload-url' in attributes &&
    typeof attributes['upload-url'] === 'string'
      ? attributes['upload-url']
      : null;

  if (uploadUrl === null) {
    throw new Error('Configuration version response missing upload URL');
  }

  return {
    id: payload.data.id,
    uploadUrl,
  };
};

export const uploadConfigurationTar = async (
  uploadUrl: string,
  tarGzBuffer: Uint8Array,
): Promise<void> => {
  // Create a new Uint8Array from the buffer to ensure proper ArrayBuffer type
  const bodyData = new Uint8Array(tarGzBuffer).buffer;
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(tarGzBuffer.length),
    },
    body: bodyData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload Terraform configuration');
  }
};

export const getConfigurationVersionStatus = async (
  config: ITerraformBaseConfig,
  configVersionId: string,
): Promise<string> => {
  const response = await terraformBaseFetch(
    config,
    `/configuration-versions/${configVersionId}`,
  );

  if (!response.ok) {
    throw new Error('Failed to fetch configuration version status');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null
  ) {
    throw new Error('Invalid configuration version response');
  }

  const attributes =
    'attributes' in payload.data &&
    typeof payload.data.attributes === 'object' &&
    payload.data.attributes !== null
      ? payload.data.attributes
      : null;

  const status =
    attributes !== null &&
    'status' in attributes &&
    typeof attributes.status === 'string'
      ? attributes.status
      : 'unknown';

  return status;
};

export const waitForConfigurationReady = async (
  config: ITerraformBaseConfig,
  configVersionId: string,
  maxAttempts = 30,
  intervalMs = 1000,
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getConfigurationVersionStatus(config, configVersionId);

    if (status === 'uploaded') {
      return;
    }

    if (status === 'errored') {
      throw new Error('Configuration version upload failed');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timeout waiting for configuration to be ready');
};

export interface IOAuthClient {
  id: string;
  name: string | null;
  serviceProvider: string;
}

export interface IOAuthToken {
  id: string;
  serviceProviderUser: string | null;
}

export const listOAuthClients = async (
  config: ITerraformBaseConfig,
): Promise<IOAuthClient[]> => {
  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/oauth-clients`,
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 404) {
      throw new Error(`Organization "${config.organization}" not found`);
    }
    throw new Error('Failed to fetch OAuth clients');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  const clients: IOAuthClient[] = [];
  for (const item of payload.data) {
    if (!isRecord(item) || !('id' in item) || typeof item.id !== 'string') {
      continue;
    }
    const itemId: string = item.id;
    const attributes =
      'attributes' in item && isRecord(item.attributes)
        ? item.attributes
        : null;
    const name =
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : null;
    const serviceProvider =
      attributes !== null &&
      'service-provider' in attributes &&
      typeof attributes['service-provider'] === 'string'
        ? attributes['service-provider']
        : '';
    clients.push({ id: itemId, name, serviceProvider });
  }

  return clients;
};

export const getOAuthTokens = async (
  config: ITerraformBaseConfig,
  oauthClientId: string,
): Promise<IOAuthToken[]> => {
  const response = await terraformBaseFetch(
    config,
    `/oauth-clients/${oauthClientId}/oauth-tokens`,
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 404) {
      throw new Error('OAuth client not found');
    }
    throw new Error('Failed to fetch OAuth tokens');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  const tokens: IOAuthToken[] = [];
  for (const item of payload.data) {
    if (!isRecord(item) || !('id' in item) || typeof item.id !== 'string') {
      continue;
    }
    const itemId: string = item.id;
    const attributes =
      'attributes' in item && isRecord(item.attributes)
        ? item.attributes
        : null;
    const serviceProviderUser =
      attributes !== null &&
      'service-provider-user' in attributes &&
      typeof attributes['service-provider-user'] === 'string'
        ? attributes['service-provider-user']
        : null;
    tokens.push({ id: itemId, serviceProviderUser });
  }

  return tokens;
};

export interface IGitHubAppInstallation {
  id: string;
  name: string;
  installationId: number;
}

export const listGitHubAppInstallations = async (
  config: ITerraformBaseConfig,
): Promise<IGitHubAppInstallation[]> => {
  const response = await terraformBaseFetch(
    config,
    '/github-app/installations',
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    return [];
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  const installations: IGitHubAppInstallation[] = [];
  for (const item of payload.data) {
    if (!isRecord(item) || !('id' in item) || typeof item.id !== 'string') {
      continue;
    }
    const itemId: string = item.id;
    const attributes =
      'attributes' in item && isRecord(item.attributes)
        ? item.attributes
        : null;
    const name =
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : '';
    const installationId =
      attributes !== null &&
      'installation-id' in attributes &&
      typeof attributes['installation-id'] === 'number'
        ? attributes['installation-id']
        : 0;
    installations.push({ id: itemId, name, installationId });
  }

  return installations;
};

export type IGitHubConnection =
  | { type: 'github-app'; id: string }
  | { type: 'oauth'; id: string };

export const getGitHubConnection = async (
  config: ITerraformBaseConfig,
  githubOrgOrUser: string,
): Promise<IGitHubConnection | null> => {
  const installations = await listGitHubAppInstallations(config);
  const matchingInstallation = installations.find(
    (inst) => inst.name.toLowerCase() === githubOrgOrUser.toLowerCase(),
  );

  if (matchingInstallation) {
    return { type: 'github-app', id: matchingInstallation.id };
  }

  const clients = await listOAuthClients(config);
  const githubClient = clients.find(
    (client) =>
      client.serviceProvider === 'github' ||
      client.serviceProvider === 'github_enterprise',
  );

  if (!githubClient) {
    return null;
  }

  const tokens = await getOAuthTokens(config, githubClient.id);
  if (tokens.length === 0) {
    return null;
  }

  return { type: 'oauth', id: tokens[0].id };
};

export interface IVcsRepoSettings {
  identifier: string;
  connection: IGitHubConnection;
  branch?: string;
}

export const createTerraformWorkspaceWithVcs = async (
  config: ITerraformBaseConfig,
  workspaceName: string,
  vcsRepo: IVcsRepoSettings,
  options?: ICreateWorkspaceOptions,
): Promise<ITerraformWorkspace> => {
  const existing = await getTerraformWorkspaceByName(config, workspaceName);
  if (existing !== null) {
    return existing;
  }

  const vcsRepoAttributes: Record<string, string> = {
    identifier: vcsRepo.identifier,
    branch: vcsRepo.branch ?? '',
  };

  if (vcsRepo.connection.type === 'github-app') {
    vcsRepoAttributes['github-app-installation-id'] = vcsRepo.connection.id;
  } else {
    vcsRepoAttributes['oauth-token-id'] = vcsRepo.connection.id;
  }

  const response = await terraformBaseFetch(
    config,
    `/organizations/${config.organization}/workspaces`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'workspaces',
          attributes: {
            name: workspaceName,
            'execution-mode': options?.executionMode ?? 'remote',
            'auto-apply': options?.autoApply ?? true,
            'terraform-version': options?.terraformVersion ?? 'latest',
            'vcs-repo': vcsRepoAttributes,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Terraform Cloud token is invalid or expired');
    }
    if (response.status === 403) {
      throw new Error(
        'Terraform Cloud token lacks permission to create workspaces',
      );
    }
    if (response.status === 404) {
      throw new Error(`Organization "${config.organization}" not found`);
    }
    if (response.status === 422) {
      const errorBody: unknown = await response.json().catch(() => null);
      const detail = extractFirstErrorDetail(errorBody);
      if (detail !== null) {
        throw new Error(detail);
      }
      throw new Error('Workspace validation failed');
    }
    throw new Error('Failed to create Terraform workspace with VCS');
  }

  const payload: unknown = await response.json();
  if (
    isRecord(payload) &&
    'data' in payload &&
    isRecord(payload.data) &&
    'id' in payload.data &&
    typeof payload.data.id === 'string'
  ) {
    const payloadDataId: string = payload.data.id;
    const attributes =
      'attributes' in payload.data && isRecord(payload.data.attributes)
        ? payload.data.attributes
        : null;
    const name =
      attributes !== null &&
      'name' in attributes &&
      typeof attributes.name === 'string'
        ? attributes.name
        : workspaceName;
    return { id: payloadDataId, name };
  }

  throw new Error('Terraform workspace creation response missing ID');
};
