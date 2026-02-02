export interface IUserUserType {
  user_id: string;
  user_type_id: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export function isIUserUserType(data: unknown): data is IUserUserType {
  return (
    data !== null &&
    typeof data === 'object' &&
    'user_id' in data &&
    'user_type_id' in data &&
    'created_at' in data &&
    'updated_at' in data &&
    'deleted_at' in data &&
    typeof data.user_id === 'string' &&
    typeof data.user_type_id === 'number' &&
    typeof data.created_at === 'string' &&
    typeof data.updated_at === 'string' &&
    typeof data.deleted_at === 'string'
  );
}

export function isIUserUserTypeArray(data: unknown): data is IUserUserType[] {
  return Array.isArray(data) && data.every(isIUserUserType);
}