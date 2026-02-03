import { GitHub, Google, Facebook, Discord } from 'arctic';
import type { OAuthProvider, OAuthUserInfo } from './types';

interface OAuthConfig {
  github?: { clientId: string; clientSecret: string };
  google?: { clientId: string; clientSecret: string; redirectUri: string };
  facebook?: { clientId: string; clientSecret: string; redirectUri: string };
  discord?: { clientId: string; clientSecret: string; redirectUri: string };
}

let providers: Partial<Record<OAuthProvider, GitHub | Google | Facebook | Discord>> = {};

export function initializeOAuthProviders(config: OAuthConfig) {
  if (config.github) {
    providers.github = new GitHub(config.github.clientId, config.github.clientSecret);
  }
  if (config.google) {
    providers.google = new Google(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );
  }
  if (config.facebook) {
    providers.facebook = new Facebook(
      config.facebook.clientId,
      config.facebook.clientSecret,
      config.facebook.redirectUri,
    );
  }
  if (config.discord) {
    providers.discord = new Discord(
      config.discord.clientId,
      config.discord.clientSecret,
      config.discord.redirectUri,
    );
  }

  return providers;
}

export function getOAuthProvider(provider: OAuthProvider) {
  const p = providers[provider];
  if (!p) {
    throw new Error(`OAuth provider ${provider} not configured`);
  }
  return p;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return !!providers[provider];
}

export function getConfiguredProviders(): OAuthProvider[] {
  return Object.keys(providers) as OAuthProvider[];
}

// Fetch user info from OAuth providers
export async function fetchOAuthUserInfo(
  provider: OAuthProvider,
  accessToken: string,
): Promise<OAuthUserInfo> {
  switch (provider) {
    case 'github':
      return fetchGitHubUser(accessToken);
    case 'google':
      return fetchGoogleUser(accessToken);
    case 'facebook':
      return fetchFacebookUser(accessToken);
    case 'discord':
      return fetchDiscordUser(accessToken);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

async function fetchGitHubUser(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  // Fetch email if not public
  let email = data.email;
  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const emails = await emailResponse.json();
    email = emails.find((e: { primary: boolean }) => e.primary)?.email;
  }

  return {
    id: String(data.id),
    email: email || '',
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
  };
}

async function fetchGoogleUser(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  return {
    id: data.sub,
    email: data.email,
    name: data.name,
    avatarUrl: data.picture,
  };
}

async function fetchFacebookUser(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
  );
  const data = await response.json();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.picture?.data?.url,
  };
}

async function fetchDiscordUser(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  return {
    id: data.id,
    email: data.email,
    name: data.username,
    avatarUrl: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : undefined,
  };
}

export { GitHub, Google, Facebook, Discord };
export * from 'arctic';
