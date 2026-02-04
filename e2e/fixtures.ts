/**
 * Playwright Test Fixtures
 * Provides mock authentication and common test utilities
 */

import { test as base, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

interface IAuthUser {
  sub: string;
  email: string;
  name: string;
  nickname: string;
  picture: string;
}

interface IMockAuth {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: IAuthUser;
  accessToken: string;
  userMetadata: Record<string, unknown>;
}

interface ITerraformWorkspace {
  id: string;
  name: string;
  mode: string;
}

interface ITerraformState {
  enableEc2: boolean;
  workspaces: Map<string, ITerraformWorkspace>;
  lastRunId: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : undefined;
};

const getBooleanProp = (value: unknown, key: string): boolean | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const candidate = value[key];
  return typeof candidate === 'boolean' ? candidate : undefined;
};

// Mock user data matching Auth0 structure
const mockUser = {
  sub: 'auth0|test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  nickname: 'testuser',
  picture: 'https://example.com/avatar.png',
};

// Mock infrastructure credentials
const mockInfraCredentials = {
  sshPublicKey: 'ssh-rsa AAAA... test@example.com',
  sshPrivateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBKMock-test-key-for-playwright...
-----END OPENSSH PRIVATE KEY-----`,
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  awsRegion: 'us-east-2',
  tfcToken: 'mock_tfc_token_for_testing',
  tfcOrg: 'test-org',
  tfcWorkspace: 'test-workspace',
  tfcWorkspaces: ['test-workspace'],
};

// Mock user metadata
const mockUserMetadata = {
  github_token: 'gho_mock_github_token_for_testing',
  env: {
    NODE_ENV: 'development',
  },
  infra: mockInfraCredentials,
};

// Mock terraform state
const mockTerraformState: ITerraformState = {
  enableEc2: true,
  workspaces: new Map<string, ITerraformWorkspace>([
    [
      'test-workspace',
      { id: 'ws-test123', name: 'test-workspace', mode: 'api' },
    ],
  ]),
  lastRunId: null,
};

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  mockTerminalApi: undefined;
  mockInfraApi: undefined;
}>({
  // Fixture that sets up authentication state
  authenticatedPage: async (
    { page, context }: { page: Page; context: BrowserContext },
    run: (value: Page) => Promise<void>,
  ) => {
    const mockAuth: IMockAuth = {
      isAuthenticated: true,
      isLoading: false,
      user: {
        sub: 'auth0|test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        nickname: 'testuser',
        picture: 'https://example.com/avatar.png',
      },
      accessToken: 'mock-access-token-for-testing',
      userMetadata: {
        github_token: 'gho_mock_github_token_for_testing',
        env: { NODE_ENV: 'development' },
        infra: {
          sshPublicKey: 'ssh-rsa AAAA... test@example.com',
          sshPrivateKey:
            '-----BEGIN OPENSSH PRIVATE KEY-----\nmock-key\n-----END OPENSSH PRIVATE KEY-----',
          awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          awsRegion: 'us-east-2',
        },
      },
    };

    // Inject mock auth state into localStorage before navigation
    await context.addInitScript((auth: IMockAuth) => {
      Reflect.set(window, '__MOCK_AUTH__', auth);
    }, mockAuth);

    await run(page);
  },

  // Fixture that mocks terminal API responses
  mockTerminalApi: async (
    { page }: { page: Page },
    run: (value: undefined) => Promise<void>,
  ) => {
    // Intercept terminal API calls
    await page.route('**/api/terminal/execute', async (route) => {
      const request = route.request();
      const body: unknown = request.postDataJSON();
      const command = getStringProp(body, 'command') ?? '';

      // Simulate command responses
      let response: {
        success: boolean;
        exitCode: number;
        stdout: string;
        stderr: string;
      };

      if (command.startsWith('ls')) {
        response = {
          success: true,
          exitCode: 0,
          stdout: '.\n..\n.bashrc\n.ssh\nprojects\ntestfile',
          stderr: '',
        };
      } else if (command.startsWith('pwd')) {
        response = {
          success: true,
          exitCode: 0,
          stdout: '/home/ec2-user',
          stderr: '',
        };
      } else if (command.startsWith('whoami')) {
        response = {
          success: true,
          exitCode: 0,
          stdout: 'ec2-user',
          stderr: '',
        };
      } else if (command.startsWith('echo')) {
        const echoContent = command
          .replace(/^echo\s+/, '')
          .replace(/["']/g, '');
        response = {
          success: true,
          exitCode: 0,
          stdout: echoContent + '\n',
          stderr: '',
        };
      } else if (command.startsWith('touch') || command.startsWith('mkdir')) {
        response = {
          success: true,
          exitCode: 0,
          stdout: '',
          stderr: '',
        };
      } else if (command === 'clear') {
        response = {
          success: true,
          exitCode: 0,
          stdout: '',
          stderr: '',
        };
      } else if (command.startsWith('cat /nonexistent')) {
        response = {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'cat: /nonexistent: No such file or directory',
        };
      } else {
        // Default success response
        response = {
          success: true,
          exitCode: 0,
          stdout: `Executed: ${command}\n`,
          stderr: '',
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });

    // Mock user metadata endpoint
    await page.route('**/api/user-metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          env: mockUserMetadata.env,
          infra: mockUserMetadata.infra,
        }),
      });
    });

    // Mock terraform status
    await page.route('**/api/terraform/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'applied',
          outputs: {
            dev_ip: '54.123.45.67',
          },
        }),
      });
    });

    await run(undefined);
  },

  // Fixture that mocks infrastructure panel API responses
  mockInfraApi: async (
    { page, context }: { page: Page; context: BrowserContext },
    run: (value: undefined) => Promise<void>,
  ) => {
    const mockAuth: IMockAuth = {
      isAuthenticated: true,
      isLoading: false,
      user: {
        sub: 'auth0|test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        nickname: 'testuser',
        picture: 'https://example.com/avatar.png',
      },
      accessToken: 'mock-access-token-for-testing',
      userMetadata: {
        github_token: 'gho_mock_github_token_for_testing',
        env: { NODE_ENV: 'development' },
        infra: {
          sshPublicKey: 'ssh-rsa AAAA... test@example.com',
          sshPrivateKey:
            '-----BEGIN OPENSSH PRIVATE KEY-----\nmock-key\n-----END OPENSSH PRIVATE KEY-----',
          awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          awsRegion: 'us-east-2',
          tfcToken: 'mock_tfc_token_for_testing',
          tfcOrg: 'test-org',
          tfcWorkspace: 'test-workspace',
          tfcWorkspaces: ['test-workspace'],
        },
      },
    };
    // Inject mock auth state for infrastructure panel
    await context.addInitScript((auth: IMockAuth) => {
      Reflect.set(window, '__MOCK_AUTH__', auth);
    }, mockAuth);

    // Mock user metadata endpoint with full infra credentials
    await page.route('**/api/user-metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          env: mockUserMetadata.env,
          infra: mockInfraCredentials,
        }),
      });
    });

    // Mock user metadata infra update
    await page.route('**/api/user-metadata/infra', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          infra: mockInfraCredentials,
        }),
      });
    });

    // Mock terraform status with enableEc2 flag
    await page.route('**/api/terraform/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          enableEc2: mockTerraformState.enableEc2,
          outputs: {
            dev_ip: '54.123.45.67',
            ssh_command: 'ssh ubuntu@54.123.45.67',
          },
        }),
      });
    });

    // Mock workspace creation
    await page.route('**/api/terraform/workspace', async (route) => {
      const request = route.request();
      const body: unknown = request.postDataJSON();
      const workspaceName =
        getStringProp(body, 'workspaceName') ?? 'new-workspace';
      const workspaceId = `ws-${String(Date.now())}`;
      const mode = getStringProp(body, 'mode') ?? 'api';
      const ec2InstanceType = getStringProp(body, 'ec2InstanceType');
      const rdsInstanceClass = getStringProp(body, 'rdsInstanceClass');

      mockTerraformState.workspaces.set(workspaceName, {
        id: workspaceId,
        name: workspaceName,
        mode,
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          workspace: {
            id: workspaceId,
            name: workspaceName,
          },
          mode,
          ec2InstanceType: ec2InstanceType ?? null,
          rdsInstanceClass: rdsInstanceClass ?? null,
        }),
      });
    });

    // Mock terraform run (toggle EC2)
    await page.route('**/api/terraform/run', async (route, request) => {
      if (request.url().includes('/run/')) {
        return;
      }
      const body: unknown = request.postDataJSON();
      const enableEc2 = getBooleanProp(body, 'enableEc2');
      mockTerraformState.enableEc2 = enableEc2 ?? true;
      const runId = `run-${String(Date.now())}`;
      mockTerraformState.lastRunId = runId;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          run: {
            id: runId,
            status: 'planning',
          },
        }),
      });
    });

    // Mock terraform run status polling
    await page.route('**/api/terraform/run/*', async (route) => {
      const url = route.request().url();
      const runIdMatch = /\/run\/([^/]+)$/.exec(url);
      const runIdFromUrl = runIdMatch?.[1];
      const runId =
        typeof runIdFromUrl === 'string'
          ? runIdFromUrl
          : (mockTerraformState.lastRunId ?? 'run-unknown');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          run: {
            id: runId,
            status: 'applied',
          },
        }),
      });
    });

    await run(undefined);
  },
});

export { expect };

// Re-export for convenience
export { mockUser, mockInfraCredentials, mockUserMetadata, mockTerraformState };
