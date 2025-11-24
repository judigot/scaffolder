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
  setGithubToken: (token: string | null) => void;
  setUser: (user: IUserStore['user']) => void;
  setAccessToken: (token: string | null) => void;
  clearUserData: () => void;
}

export const useUserStore = create<IUserStore>((set) => ({
  githubToken: null,
  user: null,
  accessToken: null,
  setGithubToken: (token) => {
    set({ githubToken: token });
  },
  setUser: (user) => {
    set({ user });
  },
  setAccessToken: (token) => {
    set({ accessToken: token });
  },
  clearUserData: () => {
    set({
      githubToken: null,
      user: null,
      accessToken: null,
    });
  },
}));
