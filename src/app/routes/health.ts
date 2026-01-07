import { Hono } from 'hono';

const router = new Hono();

interface IHealthCheck {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
  message?: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface IHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  checks: IHealthCheck[];
}

/**
 * Atomic health check function for individual environment variable.
 * Each check is independent and isolated - no shared state or side effects.
 */
function checkEnvironmentVariable(
  varName: string,
  options?: {
    severity?: 'critical' | 'warning' | 'info';
    validator?: (value: string) => { valid: boolean; message?: string };
    description?: string;
  },
): IHealthCheck {
  const startTime = Date.now();
  try {
    const value = process.env[varName];
    const duration = Date.now() - startTime;
    const severity = options?.severity ?? 'critical';

    // Check if variable exists and is not empty
    if (value === undefined || value === '' || value.trim() === '') {
      return {
        name: varName.toLowerCase(),
        status: 'fail',
        duration,
        severity,
        message: `${varName} is not set or is empty. ${options?.description ?? 'Set this environment variable in your .env file.'}`,
      };
    }

    // Run custom validator if provided
    if (options?.validator) {
      const validation = options.validator(value.trim());
      if (!validation.valid) {
        return {
          name: varName.toLowerCase(),
          status: 'fail',
          duration,
          severity,
          message: validation.message ?? `${varName} validation failed.`,
        };
      }
    }

    return {
      name: varName.toLowerCase(),
      status: 'pass',
      duration,
      severity,
      message: `${varName} is configured${options?.description !== undefined && options.description !== '' ? `: ${options.description}` : ''}`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: varName.toLowerCase(),
      status: 'fail',
      duration,
      severity: options?.severity ?? 'critical',
      message: `Error checking ${varName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Individual health check for VITE_AUTH0_DOMAIN
 */
function checkViteAuth0Domain(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('VITE_AUTH0_DOMAIN', {
      severity: 'critical',
      description:
        'Required for Auth0 authentication. Should be your Auth0 domain (e.g., your-tenant.auth0.com)',
    }),
  );
}

/**
 * Individual health check for VITE_AUTH0_CLIENT_ID
 */
function checkViteAuth0ClientId(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('VITE_AUTH0_CLIENT_ID', {
      severity: 'critical',
      description:
        'Required for Auth0 authentication. Should be your Auth0 application client ID',
    }),
  );
}

/**
 * Individual health check for VITE_AUTH0_AUDIENCE
 */
function checkViteAuth0Audience(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('VITE_AUTH0_AUDIENCE', {
      severity: 'critical',
      description:
        'Required for Auth0 authentication. Should be your Auth0 API identifier',
    }),
  );
}

/**
 * Individual health check for ENCRYPTION_KEY
 */
function checkEncryptionKey(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('ENCRYPTION_KEY', {
      severity: 'warning',
      description:
        'Required for encrypting sensitive data. Should be a 64-character hex string (32 bytes)',
      validator: (value: string) => {
        if (value.length !== 64) {
          return {
            valid: false,
            message:
              'ENCRYPTION_KEY must be exactly 64 characters (32 bytes in hex format)',
          };
        }
        const hexRegex = /^[0-9a-fA-F]{64}$/;
        if (!hexRegex.test(value)) {
          return {
            valid: false,
            message:
              'ENCRYPTION_KEY must be a valid hex string (only 0-9, a-f, A-F characters allowed)',
          };
        }
        return { valid: true };
      },
    }),
  );
}

/**
 * Individual health check for AUTH0_MANAGEMENT_API_CLIENT_ID
 */
function checkAuth0ManagementApiClientId(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('AUTH0_MANAGEMENT_API_CLIENT_ID', {
      severity: 'warning',
      description:
        'Required for Auth0 Management API operations (user metadata, GitHub token storage). Should be your Auth0 Machine-to-Machine application client ID',
    }),
  );
}

/**
 * Individual health check for AUTH0_MANAGEMENT_API_CLIENT_SECRET
 */
function checkAuth0ManagementApiClientSecret(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('AUTH0_MANAGEMENT_API_CLIENT_SECRET', {
      severity: 'warning',
      description:
        'Required for Auth0 Management API operations (user metadata, GitHub token storage). Should be your Auth0 Machine-to-Machine application client secret',
    }),
  );
}

/**
 * Individual health check for GITHUB_APP_ID
 */
function checkGitHubAppId(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('GITHUB_APP_ID', {
      severity: 'warning',
      description:
        'Required for GitHub App authentication. Should be your GitHub App ID (numeric)',
      validator: (value: string) => {
        if (Number.isNaN(Number.parseInt(value, 10))) {
          return {
            valid: false,
            message: 'GITHUB_APP_ID must be a valid number',
          };
        }
        return { valid: true };
      },
    }),
  );
}

/**
 * Individual health check for GITHUB_APP_PRIVATE_KEY
 */
function checkGitHubAppPrivateKey(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('GITHUB_APP_PRIVATE_KEY', {
      severity: 'warning',
      description:
        'Required for GitHub App authentication. Should be your GitHub App private key (PEM format)',
      validator: (value: string) => {
        const hasBeginMarker = value.includes('-----BEGIN');
        const hasEndMarker = value.includes('-----END');
        if (!hasBeginMarker || !hasEndMarker) {
          return {
            valid: false,
            message:
              'GITHUB_APP_PRIVATE_KEY must be in PEM format (should contain -----BEGIN and -----END markers)',
          };
        }
        return { valid: true };
      },
    }),
  );
}

/**
 * Individual health check for GITHUB_APP_SLUG
 */
function checkGitHubAppSlug(): Promise<IHealthCheck> {
  return Promise.resolve(
    checkEnvironmentVariable('GITHUB_APP_SLUG', {
      severity: 'info',
      description:
        'Optional: GitHub App slug (name) for generating installation URLs. Found in your GitHub App settings URL: github.com/settings/apps/{slug}',
    }),
  );
}

/**
 * Atomic health check function for process liveness.
 * Each check is independent and isolated - no shared state or side effects.
 */
function checkLiveness(): Promise<IHealthCheck> {
  const startTime = Date.now();
  try {
    // Liveness check: if we can execute this, process is alive
    const duration = Date.now() - startTime;
    return Promise.resolve({
      name: 'liveness',
      status: 'pass',
      duration,
      severity: 'critical',
      message: 'Process is running',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    return Promise.resolve({
      name: 'liveness',
      status: 'fail',
      duration,
      severity: 'critical',
      message: `Error checking liveness: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Health check endpoint for monitoring and orchestration systems.
 * Returns the overall health status and individual check results.
 *
 * All checks are executed atomically (in parallel, independently, with no shared state).
 * Each check is isolated and cannot affect other checks.
 *
 * Status levels:
 * - healthy: All critical checks pass
 * - degraded: Some non-critical checks fail (e.g., optional features)
 * - unhealthy: Critical checks fail (e.g., server configuration)
 */
router.get('/', async (c) => {
  const overallStartTime = Date.now();

  try {
    // Execute all checks atomically in parallel
    // Each check is independent and isolated - no shared state or side effects
    const [
      viteAuth0DomainCheck,
      viteAuth0ClientIdCheck,
      viteAuth0AudienceCheck,
      encryptionKeyCheck,
      auth0ManagementApiClientIdCheck,
      auth0ManagementApiClientSecretCheck,
      githubAppIdCheck,
      githubAppPrivateKeyCheck,
      githubAppSlugCheck,
      livenessCheck,
    ] = await Promise.all([
      checkViteAuth0Domain(),
      checkViteAuth0ClientId(),
      checkViteAuth0Audience(),
      checkEncryptionKey(),
      checkAuth0ManagementApiClientId(),
      checkAuth0ManagementApiClientSecret(),
      checkGitHubAppId(),
      checkGitHubAppPrivateKey(),
      checkGitHubAppSlug(),
      checkLiveness(),
    ]);

    const checks: IHealthCheck[] = [
      viteAuth0DomainCheck,
      viteAuth0ClientIdCheck,
      viteAuth0AudienceCheck,
      encryptionKeyCheck,
      auth0ManagementApiClientIdCheck,
      auth0ManagementApiClientSecretCheck,
      githubAppIdCheck,
      githubAppPrivateKeyCheck,
      githubAppSlugCheck,
      livenessCheck,
    ];

    // Determine overall status based on check results
    // Critical checks must all pass for healthy status
    const criticalChecks = checks.filter(
      (check) => check.severity === 'critical',
    );
    const failedCriticalChecks = criticalChecks.filter(
      (check) => check.status === 'fail',
    );
    const failedWarningChecks = checks.filter(
      (check) => check.severity === 'warning' && check.status === 'fail',
    );

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (failedCriticalChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (failedWarningChecks.length > 0) {
      overallStatus = 'degraded';
    }

    const response: IHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    };

    // Return appropriate HTTP status code
    const statusCode =
      overallStatus === 'healthy'
        ? 200
        : overallStatus === 'degraded'
          ? 200
          : 503;

    return c.json(response, statusCode);
  } catch (error) {
    // If the health check itself fails, return unhealthy status
    const duration = Date.now() - overallStartTime;
    const response: IHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'health_check',
          status: 'fail',
          duration,
          severity: 'critical',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
    return c.json(response, 503);
  }
});

/**
 * Liveness probe - indicates if the process is running.
 * Used by orchestration systems (Kubernetes, Docker) to determine if container should be restarted.
 */
router.get('/live', (c) => {
  return c.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Process is alive',
    },
    200,
  );
});

/**
 * Readiness probe - indicates if the service can handle traffic.
 * Used by load balancers to determine if traffic should be routed to this instance.
 */
router.get('/ready', (c) => {
  // Check critical environment variables for readiness
  const criticalVars = [
    'VITE_AUTH0_DOMAIN',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_AUDIENCE',
  ];

  const checks: Record<string, 'configured' | 'not_configured'> = {};
  let isReady = true;

  for (const varName of criticalVars) {
    const value = process.env[varName];
    const configured =
      value !== undefined && value !== '' && value.trim() !== '';
    checks[varName.toLowerCase()] = configured
      ? 'configured'
      : 'not_configured';
    if (!configured) {
      isReady = false;
    }
  }

  return c.json(
    {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    isReady ? 200 : 503,
  );
});

export default router;
