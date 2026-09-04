export interface IAuthSession {
  userId: string;
}

export function getAuthSession(): Promise<IAuthSession | null> {
  return Promise.resolve(null);
}
