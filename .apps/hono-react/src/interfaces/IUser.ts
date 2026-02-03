export interface IUser {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export function isIUser(data: unknown): data is IUser {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'email' in data &&
    'username' in data &&
    'password_hash' in data &&
    'first_name' in data &&
    'last_name' in data &&
    'avatar_url' in data &&
    'email_verified' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.id === 'string' &&
    typeof data.email === 'string' &&
    typeof data.username === 'string' &&
    typeof data.password_hash === 'string' &&
    typeof data.first_name === 'string' &&
    typeof data.last_name === 'string' &&
    typeof data.avatar_url === 'string' &&
    typeof data.email_verified === 'boolean' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIUserArray(data: unknown): data is IUser[] {
  return Array.isArray(data) && data.every(isIUser);
}