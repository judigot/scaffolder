import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';

interface IGitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId?: number;
}

interface IGetInstallationTokenOptions {
  owner?: string;
  repo?: string;
  installationId?: number;
}

const tokenCache = new Map<
  number,
  {
    token: string;
    expiresAt: number;
  }
>();

const TOKEN_CACHE_BUFFER_MS = 60 * 1000; /* 1 minute buffer before expiration */

export function clearInstallationTokenCache(installationId?: number): void {
  if (installationId !== undefined) {
    tokenCache.delete(installationId);
  } else {
    tokenCache.clear();
  }
}

export function getAppJWT(appId: string, privateKey: string): string {
  /* Validate private key format */
  if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
    throw new Error(
      'Invalid private key format. Private key must be in PEM format with -----BEGIN and -----END markers.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat:
      now -
      60 /* Issued at time (60 seconds in the past to account for clock skew) */,
    exp: now + 60 * 10 /* Expires in 10 minutes */,
    iss: appId /* Issuer (GitHub App ID) */,
  };

  try {
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('asymmetric key')) {
        throw new Error(
          'Invalid private key format. Ensure the key is a valid RSA private key in PEM format with proper newlines. ' +
            'In your .env file, use escaped newlines (\\n) or keep the key on multiple lines.',
        );
      }
      throw error;
    }
    throw new Error('Failed to sign JWT with private key');
  }
}

async function getInstallationId(
  appJWT: string,
  owner: string,
): Promise<number | null> {
  try {
    const octokit = new Octokit({
      auth: appJWT,
    });

    const installations = await octokit.apps.listInstallations();

    for (const installation of installations.data) {
      if (installation.account?.login === owner) {
        return installation.id;
      }
    }

    /* If no exact match, try to find any installation */
    if (installations.data.length > 0) {
      const firstInstallation = installations.data[0];
      return firstInstallation.id;
    }

    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Failed to get installation ID:', error.message);
    }
    return null;
  }
}

async function getInstallationToken(
  appJWT: string,
  installationId: number,
): Promise<string> {
  const octokit = new Octokit({
    auth: appJWT,
  });

  const response = await octokit.apps.createInstallationAccessToken({
    installation_id: installationId,
  });

  return response.data.token;
}

export async function getGitHubAppToken(
  config: IGitHubAppConfig,
  options?: IGetInstallationTokenOptions,
): Promise<string> {
  const { appId, privateKey, installationId: configInstallationId } = config;
  const { owner, installationId: optionsInstallationId } = options ?? {};

  const appJWT = getAppJWT(appId, privateKey);

  let finalInstallationId: number | null = null;

  /* Determine installation ID from options, config, or discovery */
  if (optionsInstallationId !== undefined) {
    finalInstallationId = optionsInstallationId;
  } else if (configInstallationId !== undefined) {
    finalInstallationId = configInstallationId;
  } else if (owner !== undefined && owner !== '') {
    finalInstallationId = await getInstallationId(appJWT, owner);
  } else {
    throw new Error(
      'Installation ID or owner is required to get GitHub App token',
    );
  }

  if (finalInstallationId === null) {
    interface IGitHubAppError extends Error {
      code?: string;
      installationUrl?: Promise<string>;
    }

    const ownerText = owner ?? 'the specified account';
    const error: IGitHubAppError = new Error(
      `GitHub App is not installed for ${ownerText}`,
    );
    error.code = 'GITHUB_APP_NOT_INSTALLED';
    error.installationUrl = getInstallationUrl(owner, appJWT);
    throw error;
  }

  /* Check if we have a cached token for this installation that's still valid */
  const cached = tokenCache.get(finalInstallationId);
  if (
    cached !== undefined &&
    cached.expiresAt > Date.now() + TOKEN_CACHE_BUFFER_MS
  ) {
    return cached.token;
  }

  const token = await getInstallationToken(appJWT, finalInstallationId);

  /* Cache the token with expiration per installation */
  const expiresAt =
    Date.now() +
    50 * 60 * 1000; /* GitHub tokens expire in ~1 hour, cache for 50 minutes */
  tokenCache.set(finalInstallationId, {
    token,
    expiresAt,
  });

  return token;
}

export async function getGitHubAppOctokit(
  config: IGitHubAppConfig,
  options?: IGetInstallationTokenOptions,
): Promise<Octokit> {
  const token = await getGitHubAppToken(config, options);
  return new Octokit({
    auth: token,
  });
}

async function getAppSlug(appJWT: string): Promise<string | null> {
  try {
    const octokit = new Octokit({
      auth: appJWT,
    });
    const app = await octokit.apps.getAuthenticated();
    /* The slug is in the app name, but we need to make it URL-friendly */
    /* GitHub uses the app name as the slug, but it's URL-encoded */
    if (app.data) {
      const appName = app.data.name;
      if (typeof appName === 'string' && appName !== '') {
        /* Convert app name to slug format (lowercase, replace spaces with hyphens) */
        return appName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Failed to get app slug:', error.message);
    }
    return null;
  }
}

export async function getInstallationUrl(
  owner?: string,
  appJWT?: string,
): Promise<string> {
  let jwt = appJWT;

  /* If appJWT is not provided, try to generate it from config */
  if (jwt === undefined) {
    const config = getGitHubAppConfig();
    if (config !== null) {
      jwt = getAppJWT(config.appId, config.privateKey);
    }
  }

  /* Try to get app slug dynamically from the API */
  let appSlug: string | null = null;
  if (jwt !== undefined) {
    appSlug = await getAppSlug(jwt);
  }

  /* If we still don't have a slug, use fallback */
  if (appSlug === null) {
    return 'https://github.com/settings/apps'; /* Fallback to apps settings */
  }

  let url = `https://github.com/apps/${appSlug}/installations/new`;
  if (owner !== undefined && owner !== '') {
    url += `?state=${encodeURIComponent(owner)}`;
  }
  return url;
}

export function getGitHubAppConfig(): IGitHubAppConfig | null {
  const appIdEnv: unknown = process.env.GITHUB_APP_ID;
  const privateKeyEnv: unknown = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationIdEnv: unknown = process.env.GITHUB_APP_INSTALLATION_ID;

  if (typeof appIdEnv !== 'string' || appIdEnv === '') {
    return null;
  }

  if (typeof privateKeyEnv !== 'string' || privateKeyEnv === '') {
    return null;
  }

  /* Private key might be base64 encoded or have newlines escaped */
  let privateKey = privateKeyEnv.trim();

  /* If it doesn't look like a PEM key, try base64 decode */
  if (!privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKeyEnv, 'base64').toString('utf-8');
    } catch {
      /* If base64 decode fails, use as-is */
    }
  }

  /* Replace escaped newlines (handle both \n and \\n) */
  privateKey = privateKey.replace(/\\n/g, '\n');

  /* If the key is all on one line (no actual newlines), we need to add them */
  /* Check if BEGIN and END are on the same "line" (no newline between them) */
  if (
    privateKey.includes('-----BEGIN') &&
    privateKey.includes('-----END') &&
    !privateKey.includes('\n')
  ) {
    /* Add newline after BEGIN marker */
    privateKey = privateKey.replace(
      /(-----BEGIN RSA PRIVATE KEY-----)([^\n])/,
      '$1\n$2',
    );
    /* Add newline before END marker */
    privateKey = privateKey.replace(
      /([^\n])(-----END RSA PRIVATE KEY-----)/,
      '$1\n$2',
    );
  }

  /* Also handle case where newlines might be missing in the middle of the key */
  /* If we have BEGIN and END but the key content looks compressed, try to format it */
  const beginMatch =
    /-----BEGIN RSA PRIVATE KEY-----(.+?)-----END RSA PRIVATE KEY-----/s.exec(
      privateKey,
    );
  const keyContent = beginMatch?.[1];
  if (keyContent !== undefined && keyContent.length > 0) {
    const trimmedContent = keyContent.trim();
    /* Remove any existing whitespace/newlines from the key content */
    const cleanContent = trimmedContent.replace(/\s+/g, '');
    /* If the key content has no newlines and is very long, it's likely compressed */
    if (cleanContent.length > 100) {
      /* Base64 encoded keys are typically 64 characters per line */
      /* Split into chunks of 64 characters */
      const chunks = cleanContent.match(/.{1,64}/g);
      const formattedContent = chunks ? chunks.join('\n') : cleanContent;
      privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${formattedContent}\n-----END RSA PRIVATE KEY-----`;
    }
  }

  const config: IGitHubAppConfig = {
    appId: appIdEnv,
    privateKey,
  };

  if (
    typeof installationIdEnv === 'string' &&
    installationIdEnv !== '' &&
    !Number.isNaN(Number.parseInt(installationIdEnv, 10))
  ) {
    config.installationId = Number.parseInt(installationIdEnv, 10);
  }

  return config;
}
