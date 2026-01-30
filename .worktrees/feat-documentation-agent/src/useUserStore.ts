import { create } from 'zustand';

export interface IUserStore {
  githubToken: string | null;
  user: {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: unknown;
  } | null;
  accessToken: string | null;
  userMetadata: Record<string, unknown> | null;
  setGithubToken: (token: string | null) => void;
  setUser: (user: IUserStore['user']) => void;
  setAccessToken: (token: string | null) => void;
  setUserMetadata: (metadata: Record<string, unknown> | null) => void;
  clearUserData: () => void;
}

export const useUserStore = create<IUserStore>((set) => ({
  githubToken: null,
  user: null,
  accessToken: null,
  userMetadata: null,
  setGithubToken: (token) => {
    set({ githubToken: token });
  },
  setUser: (user) => {
    set({ user });
  },
  setAccessToken: (token) => {
    set({ accessToken: token });
  },
  setUserMetadata: (metadata) => {
    set({ userMetadata: metadata });
  },
  clearUserData: () => {
    set({
      githubToken: null,
      user: null,
      accessToken: null,
      userMetadata: null,
    });
  },
}));
