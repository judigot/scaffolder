/**
 * useChatSession Hook
 *
 * A provider-agnostic chat hook that wraps different chat adapters.
 * Components use this hook instead of importing SDK-specific hooks directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ChatAdapter,
	ChatAdapterCallbacks,
	ChatAdapterFactory,
	ChatError,
	ChatMessage,
	ChatSession,
	ChatSessionConfig,
	ChatStatus,
} from "./types";

export interface UseChatSessionOptions
	extends Omit<ChatSessionConfig, "endpoint"> {
	/** API endpoint for the chat */
	endpoint: string;
	/** Factory function to create the adapter */
	adapterFactory: ChatAdapterFactory;
}

/**
 * Hook for managing chat sessions with a pluggable adapter pattern.
 *
 * @example
 * ```tsx
 * import { useChatSession } from '@/lib/chat';
 * import { createVercelAIAdapter } from '@/lib/chat/adapters/vercel-ai';
 *
 * function ChatComponent() {
 *   const chat = useChatSession({
 *     endpoint: '/api/chat',
 *     adapterFactory: createVercelAIAdapter,
 *   });
 *
 *   return (
 *     <div>
 *       {chat.messages.map(m => <div key={m.id}>{m.content}</div>)}
 *       <button onClick={() => chat.send('Hello!')}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChatSession(options: UseChatSessionOptions): ChatSession {
	const { endpoint, adapterFactory, ...configOptions } = options;

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [status, setStatus] = useState<ChatStatus>("idle");
	const [error, setError] = useState<ChatError | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(
		configOptions.sessionId ?? null,
	);

	const adapterRef = useRef<ChatAdapter | null>(null);
	const lastUserMessageRef = useRef<string | null>(null);
	const currentAssistantIdRef = useRef<string | null>(null);
	const configOptionsRef = useRef(configOptions);
	configOptionsRef.current = configOptions;

	// Create adapter on mount
	useEffect(() => {
		adapterRef.current = adapterFactory();
		return () => {
			adapterRef.current?.dispose();
			adapterRef.current = null;
		};
	}, [adapterFactory]);

	// Update session ID when config changes
	useEffect(() => {
		if (configOptions.sessionId) {
			setSessionId(configOptions.sessionId);
		}
	}, [configOptions.sessionId]);

	const send = useCallback(
		(content: string) => {
			if (
				!adapterRef.current ||
				status === "loading" ||
				status === "streaming"
			) {
				return;
			}

			const trimmedContent = content.trim();
			if (!trimmedContent) return;

			lastUserMessageRef.current = trimmedContent;
			setError(null);
			setStatus("loading");

			// Add user message immediately
			const userMessage: ChatMessage = {
				id: `user-${Date.now()}`,
				role: "user",
				content: trimmedContent,
				createdAt: new Date(),
			};
			setMessages((prev) => [...prev, userMessage]);

			const config: ChatSessionConfig = {
				endpoint,
				sessionId: sessionId ?? undefined,
				...configOptionsRef.current,
			};

			const callbacks: ChatAdapterCallbacks = {
				onMessageStart: (messageId) => {
					currentAssistantIdRef.current = messageId;
					setStatus("streaming");
					// Add placeholder assistant message
					const assistantMessage: ChatMessage = {
						id: messageId,
						role: "assistant",
						content: "",
						createdAt: new Date(),
					};
					setMessages((prev) => [...prev, assistantMessage]);
				},
				onStreamingText: (text, messageId) => {
					setMessages((prev) =>
						prev.map((m) => (m.id === messageId ? { ...m, content: text } : m)),
					);
					configOptionsRef.current.onStreamingText?.(text, messageId);
				},
				onMessageComplete: (message) => {
					setMessages((prev) =>
						prev.map((m) => (m.id === message.id ? message : m)),
					);
					setStatus("idle");
					currentAssistantIdRef.current = null;
					configOptionsRef.current.onMessage?.(message);
					configOptionsRef.current.onFinish?.(message);
				},
				onError: (err) => {
					setError(err);
					setStatus("error");
					currentAssistantIdRef.current = null;
					configOptionsRef.current.onError?.(err);
				},
				onSessionId: (newSessionId) => {
					setSessionId(newSessionId);
				},
			};

			adapterRef.current.send(trimmedContent, config, callbacks);
		},
		[endpoint, sessionId, status],
	);

	const stop = useCallback(() => {
		adapterRef.current?.stop();
		setStatus("idle");
	}, []);

	const retry = useCallback(() => {
		if (!lastUserMessageRef.current) return;

		// Remove the last user message and failed assistant message
		setMessages((prev) => {
			const newMessages = [...prev];
			// Remove last assistant message if it exists and is empty/error
			if (
				newMessages.length > 0 &&
				newMessages[newMessages.length - 1]?.role === "assistant"
			) {
				newMessages.pop();
			}
			// Remove the last user message
			if (
				newMessages.length > 0 &&
				newMessages[newMessages.length - 1]?.role === "user"
			) {
				newMessages.pop();
			}
			return newMessages;
		});

		setError(null);
		send(lastUserMessageRef.current);
	}, [send]);

	const clear = useCallback(() => {
		setMessages([]);
		setError(null);
		setStatus("idle");
		lastUserMessageRef.current = null;
		currentAssistantIdRef.current = null;
	}, []);

	const setMessagesExternal = useCallback((newMessages: ChatMessage[]) => {
		setMessages(newMessages);
	}, []);

	return {
		messages,
		status,
		error,
		isLoading: status === "loading" || status === "streaming",
		sessionId,
		send,
		stop,
		retry,
		clear,
		setMessages: setMessagesExternal,
	};
}
