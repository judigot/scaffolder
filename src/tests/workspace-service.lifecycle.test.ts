import { describe, expect, it } from 'vitest';
import {
  canTransitionWorkspaceStatus,
  clearWorkspaceStore,
  createWorkspace,
  retryWorkspaceBootstrap,
  updateWorkspaceStatus,
} from '@/app/services/workspaceService.ts';

describe('workspace status lifecycle', () => {
  it('allows valid forward transitions and rejects invalid ones', () => {
    expect(canTransitionWorkspaceStatus('queued', 'infra_provisioning')).toBe(
      true,
    );
    expect(canTransitionWorkspaceStatus('queued', 'ready')).toBe(false);
    expect(canTransitionWorkspaceStatus('health_checking', 'ready')).toBe(true);
  });

  it('updates status using valid transitions', () => {
    clearWorkspaceStore();
    const workspace = createWorkspace('user_1', {
      workspaceName: 'alice-dev',
      domain: 'alice-dev.example.com',
    });

    const infraProvisioning = updateWorkspaceStatus(
      workspace.id,
      'infra_provisioning',
    );
    const infraReady = updateWorkspaceStatus(
      infraProvisioning.id,
      'infra_ready',
    );

    expect(infraProvisioning.status).toBe('infra_provisioning');
    expect(infraReady.status).toBe('infra_ready');
  });

  it('rejects invalid transitions', () => {
    clearWorkspaceStore();
    const workspace = createWorkspace('user_1', {
      workspaceName: 'alice-dev',
      domain: 'alice-dev.example.com',
    });

    expect(() => updateWorkspaceStatus(workspace.id, 'ready')).toThrow(
      'Invalid workspace status transition',
    );
  });

  it('retries bootstrap from failed state to infra_ready', () => {
    clearWorkspaceStore();
    const workspace = createWorkspace('user_1', {
      workspaceName: 'alice-dev',
      domain: 'alice-dev.example.com',
    });

    updateWorkspaceStatus(workspace.id, 'infra_provisioning');
    updateWorkspaceStatus(workspace.id, 'failed', 'provisioning failed');

    const retried = retryWorkspaceBootstrap(workspace.id, 'user_1');
    expect(retried.status).toBe('infra_ready');
  });
});
