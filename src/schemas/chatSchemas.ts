/**
 * Zod schemas for chat API validation
 * Uses Zod 4 syntax for runtime type safety on business-critical data
 *
 * Note: Message validation uses manual type guards because Zod's inferred types
 * (with index signatures from looseObject) are incompatible with the AI SDK's
 * strict UIMessage discriminated union type.
 */

import { z } from 'zod';

// =============================================================================
// User AI Keys Schemas (Business Critical - Using Zod)
// =============================================================================

/**
 * Schema for AI provider API keys stored in user metadata
 * These are security-critical and benefit from Zod's strict validation
 */
export const UserAIKeysSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

/**
 * Schema for user metadata env object containing API keys
 */
export const UserMetadataEnvSchema = z.looseObject({
  env: UserAIKeysSchema.optional(),
});

export type IUserAIKeys = z.infer<typeof UserAIKeysSchema>;
export type IUserMetadataEnv = z.infer<typeof UserMetadataEnvSchema>;

// =============================================================================
// Model Configuration Schemas (Using Zod)
// =============================================================================

/**
 * Valid model IDs - using Zod enum for runtime validation
 */
export const ModelIdSchema = z.enum([
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-5.2-codex',
  'claude-haiku-3.5',
  'claude-sonnet-4.5',
  'claude-opus-4.5',
]);

export type ModelId = z.infer<typeof ModelIdSchema>;

// =============================================================================
// Message Validation (Manual Type Guards for SDK Compatibility)
// =============================================================================

/**
 * Type guard to check if value is a Record with string keys
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to validate if a value is a valid message part
 */
function isValidMessagePart(part: unknown): boolean {
  if (!isRecord(part)) {
    return false;
  }
  return typeof part.type === 'string';
}

/**
 * Type guard to validate if a value is a valid UI message
 * This uses manual validation to preserve type compatibility with the AI SDK
 */
function isValidUIMessage(msg: unknown): boolean {
  if (!isRecord(msg)) {
    return false;
  }

  // Check role - required field
  if (typeof msg.role !== 'string') {
    return false;
  }

  const validRoles = ['system', 'user', 'assistant'];
  if (!validRoles.includes(msg.role)) {
    return false;
  }

  // Check parts - required field
  if (!Array.isArray(msg.parts)) {
    return false;
  }

  // Validate each part has at least a type property
  return msg.parts.every(isValidMessagePart);
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates and extracts AI keys from user metadata
 * Returns null values for missing or invalid keys
 */
export function extractAIKeysFromMetadata(metadata: unknown): {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
} {
  const result = UserMetadataEnvSchema.safeParse(metadata);

  if (!result.success || result.data.env === undefined) {
    return { openaiApiKey: null, anthropicApiKey: null };
  }

  const env = result.data.env;

  return {
    openaiApiKey: env.OPENAI_API_KEY ?? null,
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? null,
  };
}

/**
 * Checks if a model ID is valid
 */
export function isValidModelId(id: unknown): id is ModelId {
  return ModelIdSchema.safeParse(id).success;
}

/**
 * Result type for chat request validation
 */
export interface IChatRequestValidationSuccess<TMessage> {
  success: true;
  messages: TMessage[];
  model: string | undefined;
}

export interface IChatRequestValidationError {
  success: false;
  error: string;
}

export type ChatRequestValidationResult<TMessage> =
  | IChatRequestValidationSuccess<TMessage>
  | IChatRequestValidationError;

/**
 * Validates a chat request body.
 *
 * Uses manual type guards for message validation to preserve type compatibility
 * with the AI SDK's UIMessage type. The caller passes their expected message type
 * as a type parameter.
 *
 * @typeParam TMessage - The message type expected by the caller (e.g., Omit<UIMessage, "id">)
 */
export function validateChatRequest<TMessage>(
  body: unknown,
): ChatRequestValidationResult<TMessage> {
  // Check basic structure
  if (!isRecord(body)) {
    return { success: false, error: 'Invalid request body' };
  }

  if (!('messages' in body)) {
    return { success: false, error: 'Request must include messages' };
  }

  if (!Array.isArray(body.messages)) {
    return { success: false, error: 'messages must be an array' };
  }

  // Validate each message structure
  if (!body.messages.every(isValidUIMessage)) {
    return { success: false, error: 'Invalid message structure' };
  }

  // Extract model (optional)
  const model = typeof body.model === 'string' ? body.model : undefined;

  // Messages are validated - return with caller's expected type
  // Type assertion is safe because we've validated the structure
  // eslint-disable-next-line no-type-assertion/no-type-assertion
  const typedMessages = body.messages as TMessage[];

  return {
    success: true,
    messages: typedMessages,
    model,
  };
}
