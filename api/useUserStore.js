import { create } from 'zustand';
export const useUserStore = create((set) => ({
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
