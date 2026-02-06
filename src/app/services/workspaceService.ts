import { randomBytes, randomUUID } from 'node:crypto';
import type {
  IWorkspaceInstance,
  IWorkspaceStatus,
} from '@/interfaces/IWorkspace.ts';
import type { IWorkspaceProvisionRequestParsed } from '@/schemas/workspaces.ts';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_INSTANCE_TYPE = 't3.small';

const WORKSPACE_STATUS_TRANSITIONS: Record<
  IWorkspaceStatus,
  IWorkspaceStatus[]
> = {
  queued: ['infra_provisioning', 'failed'],
  infra_provisioning: ['infra_ready', 'failed'],
  infra_ready: ['bootstrap_running', 'failed'],
  bootstrap_running: ['health_checking', 'failed'],
  health_checking: ['ready', 'failed'],
  ready: ['failed'],
  failed: ['queued', 'infra_ready'],
};

const workspaces = new Map<string, IWorkspaceInstance>();

const makeSecretRef = (prefix: string): string => `${prefix}_${randomUUID()}`;

const makeInstanceId = (): string => `i-${randomBytes(8).toString('hex')}`;

const makeOpencodeDomain = (domain: string): string => `opencode.${domain}`;

export function canTransitionWorkspaceStatus(
  currentStatus: IWorkspaceStatus,
  nextStatus: IWorkspaceStatus,
): boolean {
  return WORKSPACE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function clearWorkspaceStore(): void {
  workspaces.clear();
}

export function createWorkspace(
  ownerUserId: string,
  request: IWorkspaceProvisionRequestParsed,
): IWorkspaceInstance {
  const now = new Date().toISOString();
  const workspaceId = `ws_${randomUUID()}`;

  const workspace: IWorkspaceInstance = {
    id: workspaceId,
    ownerUserId,
    workspaceName: request.workspaceName,
    cloudProvider: 'aws',
    region: request.region ?? DEFAULT_REGION,
    instanceType: request.instanceType ?? DEFAULT_INSTANCE_TYPE,
    instanceId: makeInstanceId(),
    domain: request.domain,
    opencodeDomain: makeOpencodeDomain(request.domain),
    status: 'queued',
    opencodeUsernameSecretRef: makeSecretRef('opencode_username'),
    opencodePasswordSecretRef: makeSecretRef('opencode_password'),
    anthropicApiKeySecretRef:
      request.anthropicApiKey !== undefined
        ? makeSecretRef('anthropic_api_key')
        : undefined,
    createdAt: now,
    updatedAt: now,
  };

  workspaces.set(workspaceId, workspace);
  return workspace;
}

export function getWorkspaceById(
  workspaceId: string,
): IWorkspaceInstance | null {
  const workspace = workspaces.get(workspaceId);
  return workspace ?? null;
}

export function getWorkspaceByIdForOwner(
  workspaceId: string,
  ownerUserId: string,
): IWorkspaceInstance | null {
  const workspace = getWorkspaceById(workspaceId);
  if (workspace?.ownerUserId !== ownerUserId) {
    return null;
  }

  return workspace;
}

export function updateWorkspaceStatus(
  workspaceId: string,
  nextStatus: IWorkspaceStatus,
  statusReason?: string,
): IWorkspaceInstance {
  const workspace = getWorkspaceById(workspaceId);
  if (workspace === null) {
    throw new Error('Workspace not found');
  }

  if (!canTransitionWorkspaceStatus(workspace.status, nextStatus)) {
    throw new Error(
      `Invalid workspace status transition from ${workspace.status} to ${nextStatus}`,
    );
  }

  const updated: IWorkspaceInstance = {
    ...workspace,
    status: nextStatus,
    statusReason,
    updatedAt: new Date().toISOString(),
  };
  workspaces.set(workspaceId, updated);
  return updated;
}

export function retryWorkspaceBootstrap(
  workspaceId: string,
  ownerUserId: string,
): IWorkspaceInstance {
  const workspace = getWorkspaceByIdForOwner(workspaceId, ownerUserId);
  if (workspace === null) {
    throw new Error('Workspace not found');
  }

  return updateWorkspaceStatus(workspace.id, 'infra_ready');
}
