import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getUserMetadata } from '@/app/services/auth0Service.ts';
import { SCHEMA_BUILDER_SYSTEM_PROMPT } from '@/prompts/index.ts';
import {
  extractAIKeysFromMetadata,
  isValidModelId,
  validateChatRequest,
  type ModelId,
} from '@/schemas/chatSchemas.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

// =============================================================================
// Model Configuration
// =============================================================================

type ModelTier = 'free' | 'premium';

interface IModelConfig {
  id: ModelId;
  name: string;
  provider: 'openai' | 'anthropic';
  modelString: string;
  tier: ModelTier;
}

const MODEL_CONFIGS: Record<ModelId, IModelConfig> = {
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    modelString: 'gpt-5-nano',
    tier: 'free',
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    modelString: 'gpt-5-mini',
    tier: 'premium',
  },
  'gpt-5.2-codex': {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    provider: 'openai',
    modelString: 'gpt-5.2-codex',
    tier: 'premium',
  },
  'claude-haiku-3.5': {
    id: 'claude-haiku-3.5',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    modelString: 'claude-3-5-haiku-20241022',
    tier: 'free',
  },
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    modelString: 'claude-sonnet-4-5-20250929',
    tier: 'premium',
  },
  'claude-opus-4.5': {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    modelString: 'claude-opus-4-5-20251101',
    tier: 'premium',
  },
};

// =============================================================================
// Model Instance Factory
// =============================================================================

interface IUserAIKeys {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
}

/**
 * Create model instance with appropriate API key
 * Uses user key when available, falls back to server key (from env)
 */
function getModel(
  modelId: ModelId,
  userKeys: IUserAIKeys,
):
  | ReturnType<ReturnType<typeof createOpenAI>>
  | ReturnType<ReturnType<typeof createAnthropic>> {
  const config = MODEL_CONFIGS[modelId];

  if (config.provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: userKeys.anthropicApiKey ?? undefined,
    });
    return anthropic(config.modelString);
  }

  const openai = createOpenAI({
    apiKey: userKeys.openaiApiKey ?? undefined,
  });
  return openai(config.modelString);
}

// =============================================================================
// Routes
// =============================================================================

const app = new Hono();

app.use('*', cors());

// Get available models
app.get('/models', (c) => {
  const models = Object.values(MODEL_CONFIGS).map((config) => ({
    id: config.id,
    name: config.name,
    provider: config.provider,
    tier: config.tier,
  }));
  return c.json({ models });
});

app.post('/', async (c) => {
  try {
    const body: unknown = await c.req.json();

    // Validate request body using Zod schema
    // Type parameter ensures messages are compatible with AI SDK
    const validation = validateChatRequest<Omit<UIMessage, 'id'>>(body);
    if (!validation.success) {
      return c.json({ error: validation.error }, 400);
    }

    const { messages, model } = validation;

    // Get model from request, default to gpt-5-nano
    const modelId: ModelId = isValidModelId(model) ? model : 'gpt-5-nano';
    const config = MODEL_CONFIGS[modelId];

    // Try to get user API keys from auth token
    let userKeys: IUserAIKeys = { openaiApiKey: null, anthropicApiKey: null };
    const authHeader = c.req.header('authorization');

    if (authHeader !== undefined) {
      const verification = await verifyAuth0TokenFromAuthHeader(authHeader);
      if (verification.ok && verification.auth0UserId !== '') {
        try {
          const metadata = await getUserMetadata(verification.auth0UserId);
          userKeys = extractAIKeysFromMetadata(metadata);
        } catch {
          // Silently fail - user keys not available, use server keys
        }
      }
    }

    // Check if user has key for the requested provider
    const hasUserKeyForProvider =
      (config.provider === 'openai' && userKeys.openaiApiKey !== null) ||
      (config.provider === 'anthropic' && userKeys.anthropicApiKey !== null);

    // Enforce tier restrictions: premium models require user API key
    if (config.tier === 'premium' && !hasUserKeyForProvider) {
      return c.json(
        {
          error: 'Premium model requires API key',
          message: `${config.name} requires you to configure your own ${config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key in Settings.`,
          code: 'PREMIUM_MODEL_REQUIRES_KEY',
        },
        403,
      );
    }

    const convertedMessages = await convertToModelMessages(messages);

    // Build streamText options - reasoning models like gpt-5.2-codex don't support temperature
    const baseOptions = {
      model: getModel(modelId, userKeys),
      system: SCHEMA_BUILDER_SYSTEM_PROMPT,
      messages: convertedMessages,
    };

    // Only add temperature for non-reasoning models
    if (modelId !== 'gpt-5.2-codex') {
      const optionsWithTemp = {
        ...baseOptions,
        temperature: 0.7,
      };
      const result = streamText(optionsWithTemp);
      return result.toUIMessageStreamResponse();
    }

    const result = streamText(baseOptions);

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
