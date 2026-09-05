export interface IOauthAccount {
  provider_id: string;
  provider_user_id: string;
  user_id: string;
}

export function isIOauthAccount(data: unknown): data is IOauthAccount {
  return (
    data !== null &&
    typeof data === 'object' &&
    'provider_id' in data &&
    'provider_user_id' in data &&
    'user_id' in data &&
    typeof data.provider_id === 'string' &&
    typeof data.provider_user_id === 'string' &&
    typeof data.user_id === 'string'
  );
}

export function isIOauthAccountArray(data: unknown): data is IOauthAccount[] {
  return Array.isArray(data) && data.every(isIOauthAccount);
}