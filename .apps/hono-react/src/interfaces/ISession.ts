export interface ISession {
  id: string;
  user_id: string;
  expires_at: Date;
}

export function isISession(data: unknown): data is ISession {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'user_id' in data &&
    'expires_at' in data &&
    typeof data.id === 'string' &&
    typeof data.user_id === 'string' &&
    typeof data.expires_at === 'string'
  );
}

export function isISessionArray(data: unknown): data is ISession[] {
  return Array.isArray(data) && data.every(isISession);
}