export interface IProfile {
  id: number;
  user_id: string;
  bio: string;
  created_at?: Date;
  updated_at?: Date;
}

export function isIProfile(data: unknown): data is IProfile {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'user_id' in data &&
    'bio' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.id === 'number' &&
    typeof data.user_id === 'string' &&
    typeof data.bio === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIProfileArray(data: unknown): data is IProfile[] {
  return Array.isArray(data) && data.every(isIProfile);
}
