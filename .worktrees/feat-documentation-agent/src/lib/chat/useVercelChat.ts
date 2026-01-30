/**
 * useVercelChat Hook
 *
 * A wrapper around the Vercel AI SDK's useChat hook that exposes our standard
 * ChatSession interface while preserving full SDK functionality.
 *
 * Use this when you need:
 * - UIMessage type with parts (text, reasoning, etc.)
 * - DefaultChatTransport for custom request handling
 * - Model selection at request time
 * - Full Vercel AI SDK features
 *
 * For simpler use cases, use useChatSession with createVercelAIAdapter instead.
 */

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChatError, ChatMessage, ChatStatus } from "./types";

/** Extended options for useVercelChat */
export interface UseVercelChatOptions {
	/** API endpoint */
	endpoint: string;
	/** Current model ID */
	model?: string;
	/** Callback when model changes - used to update the ref */
	onModelChange?: (model: string) => void;
	/** Additional options to pass to useChat */
	useChatOptions?: Record<string, unknown>;
}

/** Extended ChatSession that includes Vercel AI SDK specific features */
export interface VercelChatSession {
	/** All messages in the conversation (Vercel AI SDK UIMessage format) */
	messages: UIMessage[];
	/** Normalized messages in our standard format */
	normalizedMessages: ChatMessage[];
	/** Current status */
	status: ChatStatus;
	/** Current error */
	error: ChatError | null;
	/** Whether loading or streaming */
	isLoading: boolean;
	/** Send a message */
	send: (content: string) => void;
	/** Stop generation */
	stop: () => void;
	/** Retry last message */
	retry: () => void;
	/** Clear messages */
	clear: () => void;
	/** The underlying Vercel AI SDK sendMessage function for advanced use */
	sendMessage: (params: { text: string }) => Promise<void>;
}

/**
 * Convert UIMessage to our ChatMessage format
 */
function normalizeMessage(message: UIMessage): ChatMessage {
	// Extract text content from parts
	const textContent = message.parts
		.filter(
			(part): part is { type: "text"; text: string } => part.type === "text",
		)
		.map((part) => part.text)
		.join("\n");

	return {
		id: message.id,
		role: message.role as "user" | "assistant" | "system",
		content: textContent,
		createdAt: new Date(),
		metadata: {
			parts: message.parts,
		},
	};
}

/**
 * Hook that wraps Vercel AI SDK's useChat while exposing our standard interface.
 *
 * @example
 * ```tsx
 * function JudasChat() {
 *   const [model, setModel] = useState<ModelId>("gpt-5-nano");
 *   const modelRef = useRef(model);
 *   modelRef.current = model;
 *
 *   const chat = useVercelChat({
 *     endpoint: '/api/chat',
 *     model,
 *   });
 *
 *   // Use chat.messages for UIMessage[] (with parts)
 *   // Use chat.normalizedMessages for ChatMessage[] (simple)
 * }
 * ```
 */
export function useVercelChat(
	options: UseVercelChatOptions,
): VercelChatSession {
	const { endpoint, model, useChatOptions } = options;

	// Store model in ref so transport can access current value
	const modelRef = useRef<string | undefined>(model);
	useEffect(() => {
		modelRef.current = model;
	}, [model]);

	// Create transport with model injection
	const transport = useMemo(() => {
		return new DefaultChatTransport({
			api: endpoint,
			prepareSendMessagesRequest: ({
				messages,
				body,
				headers,
				credentials,
				api,
				id,
				trigger,
				messageId,
			}) => {
				return {
					body: {
						...(body as Record<string, unknown>),
						id,
						messages,
						trigger,
						messageId,
						model: modelRef.current,
					},
					headers,
					credentials,
					api,
				};
			},
		});
	}, [endpoint]);

	// Use the underlying Vercel AI SDK hook
	const {
		messages,
		sendMessage,
		status: sdkStatus,
		error: sdkError,
		stop: sdkStop,
	} = useChat({
		transport,
		...useChatOptions,
	});

	// Track last user message for retry
	const lastUserMessageRef = useRef<string | null>(null);

	// Convert SDK status to our status
	const status: ChatStatus = useMemo(() => {
		if (sdkStatus === "streaming") return "streaming";
		if (sdkStatus === "submitted") return "loading";
		if (sdkError) return "error";
		return "idle";
	}, [sdkStatus, sdkError]);

	// Convert SDK error to our format
	const error: ChatError | null = useMemo(() => {
		if (!sdkError) return null;
		return {
			message: sdkError.message,
			details: sdkError,
		};
	}, [sdkError]);

	// Normalize messages to our format
	const normalizedMessages = useMemo(() => {
		return messages.map(normalizeMessage);
	}, [messages]);

	const isLoading = status === "loading" || status === "streaming";

	// Send message
	const send = useCallback(
		(content: string) => {
			const trimmed = content.trim();
			if (!trimmed || isLoading) return;

			lastUserMessageRef.current = trimmed;
			void sendMessage({ text: trimmed });
		},
		[sendMessage, isLoading],
	);

	// Stop generation
	const stop = useCallback(() => {
		void sdkStop();
	}, [sdkStop]);

	// Retry last message
	const retry = useCallback(() => {
		if (!lastUserMessageRef.current) return;

		// Stop current generation and resubmit
		void sdkStop();

		// Find last user message from messages if ref is empty
		const lastUserMsg = lastUserMessageRef.current;
		if (lastUserMsg) {
			void sendMessage({ text: lastUserMsg });
		}
	}, [sdkStop, sendMessage]);

	// Clear is not directly supported by useChat, but we can work around it
	// by using a key to remount, or just document this limitation
	const clear = useCallback(() => {
		// Note: useChat doesn't have a built-in clear method
		// The component using this hook should remount or use a different approach
		console.warn(
			"useVercelChat.clear() is not fully supported. Consider remounting the component.",
		);
	}, []);

	return {
		messages,
		normalizedMessages,
		status,
		error,
		isLoading,
		send,
		stop,
		retry,
		clear,
		sendMessage: async (params: { text: string }) => {
			await sendMessage(params);
		},
	};
}
