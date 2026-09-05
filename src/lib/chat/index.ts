/**
 * Chat Abstraction Layer
 *
 * Provides a stable, provider-agnostic interface for chat functionality.
 * Import from this module instead of SDK packages directly.
 *
 * @example
 * ```tsx
 * import { useChatSession, createVercelAIAdapter, createOpenCodeAdapter } from '@/lib/chat';
 *
 * // For Vercel AI SDK (OpenAI, Anthropic, etc.)
 * const chat = useChatSession({
 *   endpoint: '/api/chat',
 *   adapterFactory: createVercelAIAdapter,
 * });
 *
 * // For OpenCode
 * const openCodeChat = useChatSession({
 *   endpoint: '/api/opencode',
 *   adapterFactory: createOpenCodeAdapter,
 *   directory: '/path/to/project',
 * });
 * ```
 */

export { createOpenCodeAdapter } from "./adapters/opencode.ts";
// Adapters
export { createVercelAIAdapter } from "./adapters/vercel-ai.ts";
// Types (new naming convention with I prefix)
export type {
	ChatAdapterFactory,
	ChatStatus,
	IChatAdapter,
	IChatAdapterCallbacks,
	IChatError,
	IChatMessage,
	IChatSession,
	IChatSessionConfig,
	MessageRole,
} from "./types.ts";
export type { IUseChatSessionOptions } from "./useChatSession.ts";
// Hooks
export { useChatSession } from "./useChatSession.ts";
export type {
	IUseVercelChatOptions,
	IVercelChatSession,
} from "./useVercelChat.ts";
export { useVercelChat } from "./useVercelChat.ts";
