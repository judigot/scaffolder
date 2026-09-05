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
export interface IChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	createdAt: Date;
	/** Optional metadata (tool calls, attachments, etc.) */
	metadata?: Record<string, unknown>;
}

/** Error information */
export interface IChatError {
	message: string;
	code?: string;
	details?: unknown;
}

/** Configuration for a chat session */
export interface IChatSessionConfig {
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
	onMessage?: (message: IChatMessage) => void;
	/** Callback when streaming text is received */
	onStreamingText?: (text: string, messageId: string) => void;
	/** Callback when an error occurs */
	onError?: (error: IChatError) => void;
	/** Callback when the session finishes */
	onFinish?: (message: IChatMessage) => void;
}

/** The stable interface exposed by useChatSession */
export interface IChatSession {
	/** All messages in the conversation */
	messages: IChatMessage[];
	/** Current status of the chat */
	status: ChatStatus;
	/** Current error, if any */
	error: IChatError | null;
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
	setMessages: (messages: IChatMessage[]) => void;
}

/** Adapter interface - implement this for each chat provider */
export interface IChatAdapter {
	/** Send a message and handle streaming response */
	send: (
		content: string,
		config: IChatSessionConfig,
		callbacks: IChatAdapterCallbacks,
	) => void;
	/** Stop the current generation */
	stop: () => void;
	/** Clean up resources */
	dispose: () => void;
}

/** Callbacks passed to adapters */
export interface IChatAdapterCallbacks {
	onMessageStart: (messageId: string) => void;
	onStreamingText: (text: string, messageId: string) => void;
	onMessageComplete: (message: IChatMessage) => void;
	onError: (error: IChatError) => void;
	onSessionId: (sessionId: string) => void;
}

/** Factory function type for creating adapters */
export type ChatAdapterFactory = () => IChatAdapter;

// Legacy type aliases for backwards compatibility
/** @deprecated Use IChatMessage instead */
export type ChatMessage = IChatMessage;
/** @deprecated Use IChatError instead */
export type ChatError = IChatError;
/** @deprecated Use IChatSessionConfig instead */
export type ChatSessionConfig = IChatSessionConfig;
/** @deprecated Use IChatSession instead */
export type ChatSession = IChatSession;
/** @deprecated Use IChatAdapter instead */
export type ChatAdapter = IChatAdapter;
/** @deprecated Use IChatAdapterCallbacks instead */
export type ChatAdapterCallbacks = IChatAdapterCallbacks;
