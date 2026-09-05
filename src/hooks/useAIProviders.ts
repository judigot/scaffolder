import { useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import {
  type AIProvider,
  useAIProvidersStore,
} from '@/stores/useAIProvidersStore.ts';

const AI_KEY_TO_PROVIDER: Record<string, AIProvider> = {
  OPENAI_API_KEY: 'openai',
  ANTHROPIC_API_KEY: 'anthropic',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface IUseAIProvidersReturn {
  configuredProviders: Set<AIProvider>;
  /** User has configured their own OpenAI API key */
  hasOpenAIKey: boolean;
  /** User has configured their own Anthropic API key */
  hasAnthropicKey: boolean;
  /** User has at least one API key configured (unlocks premium models for that provider) */
  hasAnyKey: boolean;
  /** @deprecated Use hasOpenAIKey instead */
  hasOpenAI: boolean;
  /** @deprecated Use hasAnthropicKey instead */
  hasAnthropic: boolean;
  /** @deprecated Use hasAnyKey instead */
  hasAnyProvider: boolean;
  isLoading: boolean;
}

/**
 * Hook to check which AI providers are configured based on user metadata.
 * Syncs the configured providers to the global store for use by other components.
 *
 * With the BYO keys feature:
 * - Free tier models (gpt-5-nano, claude-haiku-3.5) are always available
 * - Premium models require user to configure their own API key for that provider
 */
export function useAIProviders(): IUseAIProvidersReturn {
  const { userMetadata, isLoading } = useUser();
  const { setConfiguredProviders } = useAIProvidersStore();

  const configuredProviders = useMemo(() => {
    const providers = new Set<AIProvider>();

    if (userMetadata === null) {
      return providers;
    }

    const env: unknown = userMetadata.env;
    if (!isRecord(env)) {
      return providers;
    }

    for (const [key, provider] of Object.entries(AI_KEY_TO_PROVIDER)) {
      const value: unknown = env[key];
      if (typeof value === 'string' && value.trim() !== '') {
        providers.add(provider);
      }
    }

    return providers;
  }, [userMetadata]);

  useEffect(() => {
    setConfiguredProviders(configuredProviders);
  }, [configuredProviders, setConfiguredProviders]);

  const hasOpenAIKey = configuredProviders.has('openai');
  const hasAnthropicKey = configuredProviders.has('anthropic');

  return {
    configuredProviders,
    // New names (preferred)
    hasOpenAIKey,
    hasAnthropicKey,
    hasAnyKey: configuredProviders.size > 0,
    // Legacy names (deprecated but kept for compatibility)
    hasOpenAI: hasOpenAIKey,
    hasAnthropic: hasAnthropicKey,
    hasAnyProvider: configuredProviders.size > 0,
    isLoading,
  };
}

/**
 * Non-reactive getter for AI providers from the store.
 * Use this in callbacks or event handlers where you need the current state.
 */
export function getConfiguredProviders(): Set<AIProvider> {
  return useAIProvidersStore.getState().configuredProviders;
}
