export interface IPosts {
  id: number;
  user_id: string;
  title: string;
  content?: string;
  created_at?: Date;
  updated_at?: Date;
}

export function isIPosts(data: unknown): data is IPosts {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'user_id' in data &&
    'title' in data &&
    'content' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    typeof data.id === 'number' &&
    typeof data.user_id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.content === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string'
  );
}

export function isIPostsArray(data: unknown): data is IPosts[] {
  return Array.isArray(data) && data.every(isIPosts);
}