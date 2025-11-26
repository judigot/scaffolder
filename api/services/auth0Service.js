import { ManagementClient } from 'auth0';
import dotenv from 'dotenv';
dotenv.config();
function getAuth0Config() {
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
let managementClient = null;
function getManagementClient() {
  if (managementClient === null) {
    const config = getAuth0Config();
    if (!config) {
      throw new Error(
        'Auth0 Management API credentials are missing. Please set AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET environment variables.',
      );
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
function isUserWithMetadata(val) {
  return (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'user_metadata' in val
  );
}
export async function getUserMetadata(auth0UserId) {
  try {
    const client = getManagementClient();
    const user = await client.users.get(auth0UserId);
    if (isUserWithMetadata(user)) {
      const metadata = user.user_metadata;
      if (typeof metadata === 'object') {
        return metadata;
      }
    }
    return null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get user metadata: ${error.message}`);
    }
    throw new Error('Failed to get user metadata: Unknown error');
  }
}
export async function updateUserMetadata(auth0UserId, metadata) {
  try {
    const client = getManagementClient();
    await client.users.update(auth0UserId, { user_metadata: metadata });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update user metadata: ${error.message}`);
    }
    throw new Error('Failed to update user metadata: Unknown error');
  }
}
export async function getGitHubToken(auth0UserId) {
  try {
    const metadata = await getUserMetadata(auth0UserId);
    if (metadata === null) {
      return null;
    }
    const token = metadata.github_token;
    if (typeof token === 'string') {
      return token;
    }
    return null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get GitHub token: ${error.message}`);
    }
    throw new Error('Failed to get GitHub token: Unknown error');
  }
}
export async function setGitHubToken(auth0UserId, token) {
  try {
    const currentMetadata = await getUserMetadata(auth0UserId);
    const updatedMetadata = {
      ...currentMetadata,
      github_token: token,
    };
    await updateUserMetadata(auth0UserId, updatedMetadata);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to set GitHub token: ${error.message}`);
    }
    throw new Error('Failed to set GitHub token: Unknown error');
  }
}
export async function deleteGitHubToken(auth0UserId) {
  try {
    const currentMetadata = await getUserMetadata(auth0UserId);
    if (currentMetadata === null) {
      return;
    }
    const { github_token: _, ...updatedMetadata } = currentMetadata;
    await updateUserMetadata(auth0UserId, updatedMetadata);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub token: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub token: Unknown error');
  }
}
