/**
 * Chat Abstraction Layer - Type Definitions
 *
 * These types provide a stable, provider-agnostic interface for chat functionality.
 * Components should use these types instead of importing directly from SDK packages.
 */

/** Message roles */
export type MessageRole = "user" | "assistant" | "system";

/** Status of the chat session */
export type ChatStatus = "idle" | "loading" | "streaming" | "error";

/** A single message in the conversation */
export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	createdAt: Date;
	/** Optional metadata (tool calls, attachments, etc.) */
	metadata?: Record<string, unknown>;
}

/** Error information */
export interface ChatError {
	message: string;
	code?: string;
	details?: unknown;
}

/** Configuration for a chat session */
export interface ChatSessionConfig {
	/** API endpoint for the chat */
	endpoint: string;
	/** Optional session ID for continuing a conversation */
	sessionId?: string;
	/** Optional directory context (for OpenCode) */
	directory?: string;
	/** Optional model override */
	model?: string;
	/** Optional system prompt */
	systemPrompt?: string;
	/** Additional headers to send with requests */
	headers?: Record<string, string>;
	/** Callback when a message is received */
	onMessage?: (message: ChatMessage) => void;
	/** Callback when streaming text is received */
	onStreamingText?: (text: string, messageId: string) => void;
	/** Callback when an error occurs */
	onError?: (error: ChatError) => void;
	/** Callback when the session finishes */
	onFinish?: (message: ChatMessage) => void;
}

/** The stable interface exposed by useChatSession */
export interface ChatSession {
	/** All messages in the conversation */
	messages: ChatMessage[];
	/** Current status of the chat */
	status: ChatStatus;
	/** Current error, if any */
	error: ChatError | null;
	/** Whether the chat is currently loading or streaming */
	isLoading: boolean;
	/** The current session ID */
	sessionId: string | null;
	/** Send a message */
	send: (content: string) => void;
	/** Stop the current generation */
	stop: () => void;
	/** Retry the last failed message */
	retry: () => void;
	/** Clear all messages */
	clear: () => void;
	/** Set messages directly (for restoring state) */
	setMessages: (messages: ChatMessage[]) => void;
}

/** Adapter interface - implement this for each chat provider */
export interface ChatAdapter {
	/** Send a message and handle streaming response */
	send: (
		content: string,
		config: ChatSessionConfig,
		callbacks: ChatAdapterCallbacks,
	) => void;
	/** Stop the current generation */
	stop: () => void;
	/** Clean up resources */
	dispose: () => void;
}

/** Callbacks passed to adapters */
export interface ChatAdapterCallbacks {
	onMessageStart: (messageId: string) => void;
	onStreamingText: (text: string, messageId: string) => void;
	onMessageComplete: (message: ChatMessage) => void;
	onError: (error: ChatError) => void;
	onSessionId: (sessionId: string) => void;
}

/** Factory function type for creating adapters */
export type ChatAdapterFactory = () => ChatAdapter;
