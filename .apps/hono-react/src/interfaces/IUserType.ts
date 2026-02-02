export interface IUserType {
  id: number;
  name: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export function isIUserType(data: unknown): data is IUserType {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'name' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    'deleted_at' in data &&
    typeof data.id === 'number' &&
    typeof data.name === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string' &&
    typeof data.deleted_at === 'string'
  );
}

export function isIUserTypeArray(data: unknown): data is IUserType[] {
  return Array.isArray(data) && data.every(isIUserType);
}
