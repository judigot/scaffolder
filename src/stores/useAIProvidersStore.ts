import { create } from 'zustand';

export type AIProvider = 'openai' | 'anthropic';

interface IAIProvidersState {
  configuredProviders: Set<AIProvider>;
  setConfiguredProviders: (providers: Set<AIProvider>) => void;
  hasProvider: (provider: AIProvider) => boolean;
  hasAnyProvider: () => boolean;
}

export const useAIProvidersStore = create<IAIProvidersState>((set, get) => ({
  configuredProviders: new Set<AIProvider>(),
  setConfiguredProviders: (providers) => {
    set({ configuredProviders: providers });
  },
  hasProvider: (provider) => {
    return get().configuredProviders.has(provider);
  },
  hasAnyProvider: () => {
    return get().configuredProviders.size > 0;
  },
}));
