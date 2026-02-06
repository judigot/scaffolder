export const WORKSPACE_STATUS_VALUES = [
  'queued',
  'infra_provisioning',
  'infra_ready',
  'bootstrap_running',
  'health_checking',
  'ready',
  'failed',
] as const;

export type IWorkspaceStatus = (typeof WORKSPACE_STATUS_VALUES)[number];

export interface IWorkspaceProvisionRequest {
  workspaceName: string;
  domain: string;
  opencodeUsername?: string;
  opencodePassword?: string;
  anthropicApiKey?: string;
  region?: string;
  instanceType?: string;
  sshPublicKeyName?: string;
}

export interface IWorkspaceInstance {
  id: string;
  ownerUserId: string;
  workspaceName: string;
  cloudProvider: 'aws';
  region: string;
  instanceType: string;
  instanceId: string;
  publicIp?: string;
  domain: string;
  opencodeDomain: string;
  status: IWorkspaceStatus;
  statusReason?: string;
  opencodeUsernameSecretRef: string;
  opencodePasswordSecretRef: string;
  anthropicApiKeySecretRef?: string;
  createdAt: string;
  updatedAt: string;
}
