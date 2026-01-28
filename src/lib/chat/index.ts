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

export { createOpenCodeAdapter } from "./adapters/opencode";
// Adapters
export { createVercelAIAdapter } from "./adapters/vercel-ai";
// Types
export type {
	ChatAdapter,
	ChatAdapterCallbacks,
	ChatAdapterFactory,
	ChatError,
	ChatMessage,
	ChatSession,
	ChatSessionConfig,
	ChatStatus,
	MessageRole,
} from "./types";
export type { UseChatSessionOptions } from "./useChatSession";
// Hooks
export { useChatSession } from "./useChatSession";
export type { UseVercelChatOptions, VercelChatSession } from "./useVercelChat";
export { useVercelChat } from "./useVercelChat";
