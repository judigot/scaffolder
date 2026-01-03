import { ManagementClient } from 'auth0';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import {
  encryptValue,
  decryptValue,
  isEncryptedValue,
} from '@/utils/serverEncryption.ts';

dotenv.config({ path: resolve(process.cwd(), '.env') });

interface IAuth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export class Auth0ManagementApiNotConfiguredError extends Error {
  constructor() {
    super(
      'Auth0 Management API credentials are missing. Please set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET environment variables.',
    );
    this.name = 'Auth0ManagementApiNotConfiguredError';
  }
}

function getAuth0Config(): IAuth0Config | null {
  const domain = process.env.VITE_AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MANAGEMENT_API_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET;

  if (
    domain === undefined ||
    domain === '' ||
    clientId === undefined ||
    clientId === '' ||
    clientSecret === undefined ||
    clientSecret === ''
  ) {
    return null;
  }

  return {
    domain,
    clientId,
    clientSecret,
  };
}

export function isAuth0ManagementApiConfigured(): boolean {
  return getAuth0Config() !== null;
}

export function getAuth0ManagementApiConfigStatus(): {
  configured: boolean;
  missing: string[];
} {
  const domain = process.env.VITE_AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MANAGEMENT_API_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET;

  const missing: string[] = [];

  if (domain === undefined || domain === '' || domain.trim() === '') {
    missing.push('VITE_AUTH0_DOMAIN');
  }
  if (clientId === undefined || clientId === '' || clientId.trim() === '') {
    missing.push('AUTH0_MANAGEMENT_API_CLIENT_ID');
  }
  if (
    clientSecret === undefined ||
    clientSecret === '' ||
    clientSecret.trim() === ''
  ) {
    missing.push('AUTH0_MANAGEMENT_API_CLIENT_SECRET');
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}

let managementClient: ManagementClient | null = null;

function getManagementClient(): ManagementClient {
  if (managementClient === null) {
    const config = getAuth0Config();
    if (!config) {
      throw new Auth0ManagementApiNotConfiguredError();
    }
    managementClient = new ManagementClient({
      domain: config.domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      audience: `https://${config.domain}/api/v2/`,
    });
  }
  return managementClient;
}

interface IUserWithMetadata {
  user_metadata?: Record<string, unknown>;
}

function isUserWithMetadata(val: unknown): val is IUserWithMetadata {
  return (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'user_metadata' in val
  );
}

export async function getUserMetadata(
  auth0UserId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const client = getManagementClient();
    const response = await client.users.get({ id: auth0UserId });
    const user = response.data;
    if (isUserWithMetadata(user)) {
      const metadata = user.user_metadata;
      if (typeof metadata === 'object') {
        return metadata;
      }
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      console.error(
        '[Server Configuration Error] Auth0 Management API credentials are missing. ' +
          'Set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET in your .env file.',
      );
      return null;
    }
    if (error instanceof Error) {
      console.error('Failed to get user metadata:', error.message);
      return null;
    }
    console.error('Failed to get user metadata: Unknown error');
    return null;
  }
}

export async function updateUserMetadata(
  auth0UserId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const client = getManagementClient();
    await client.users.update({ id: auth0UserId }, { user_metadata: metadata });
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      console.error(
        '[Server Configuration Error] Auth0 Management API credentials are missing. ' +
          'Set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET in your .env file.',
      );
      throw new Error(
        'Server configuration error: Auth0 Management API is not configured. This is a server-side issue that needs to be fixed by the developer.',
      );
    }
    if (error instanceof Error) {
      console.error('Failed to update user metadata:', error.message);
      throw new Error(`Failed to update user metadata: ${error.message}`);
    }
    console.error('Failed to update user metadata: Unknown error');
    throw new Error('Failed to update user metadata: Unknown error');
  }
}

export async function getGitHubToken(
  auth0UserId: string,
): Promise<string | null> {
  try {
    const metadata = await getUserMetadata(auth0UserId);
    if (metadata === null || !('github_token' in metadata)) {
      return null;
    }
    const token = metadata.github_token;
    if (typeof token === 'string' && token !== '') {
      if (isEncryptedValue(token)) {
        try {
          return decryptValue(token);
        } catch (decryptionError: unknown) {
          if (decryptionError instanceof Error) {
            if (decryptionError.message.includes('ENCRYPTION_KEY')) {
              console.error(
                '[Server Configuration Warning] ENCRYPTION_KEY not set. Cannot decrypt GitHub token. Set ENCRYPTION_KEY environment variable.',
              );
              return null;
            }
            throw decryptionError;
          }
          throw decryptionError;
        }
      }
      return token;
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      console.error(
        '[Server Configuration Error] Auth0 Management API credentials are missing. ' +
          'Set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET in your .env file.',
      );
      return null;
    }
    if (error instanceof Error) {
      console.error('Failed to get GitHub token:', error.message);
      return null;
    }
    console.error('Failed to get GitHub token: Unknown error');
    return null;
  }
}

export async function setGitHubToken(
  auth0UserId: string,
  token: string,
): Promise<void> {
  try {
    const currentMetadata = await getUserMetadata(auth0UserId);
    let tokenToStore: string;
    try {
      tokenToStore = encryptValue(token);
    } catch (encryptionError: unknown) {
      if (encryptionError instanceof Error) {
        if (encryptionError.message.includes('ENCRYPTION_KEY')) {
          console.error(
            'Warning: ENCRYPTION_KEY not set. Storing GitHub token as plain text. Set ENCRYPTION_KEY environment variable for production.',
          );
          tokenToStore = token;
        } else {
          throw encryptionError;
        }
      } else {
        throw encryptionError;
      }
    }
    const updatedMetadata = {
      ...currentMetadata,
      github_token: tokenToStore,
    };
    await updateUserMetadata(auth0UserId, updatedMetadata);
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Failed to set GitHub token: ${error.message}`);
    }
    throw new Error('Failed to set GitHub token: Unknown error');
  }
}

export async function deleteGitHubToken(auth0UserId: string): Promise<void> {
  try {
    const currentMetadata = await getUserMetadata(auth0UserId);
    if (currentMetadata === null) {
      return;
    }
    if (!('github_token' in currentMetadata)) {
      return;
    }
    const { github_token: _, ...updatedMetadata } = currentMetadata;
    await updateUserMetadata(auth0UserId, updatedMetadata);
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub token: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub token: Unknown error');
  }
}
