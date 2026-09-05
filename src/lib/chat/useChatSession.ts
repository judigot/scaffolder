/**
 * useChatSession Hook
 *
 * A provider-agnostic chat hook that wraps different chat adapters.
 * Components use this hook instead of importing SDK-specific hooks directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ChatAdapterFactory,
	ChatStatus,
	IChatAdapter,
	IChatAdapterCallbacks,
	IChatError,
	IChatMessage,
	IChatSession,
	IChatSessionConfig,
} from "./types.ts";

export interface IUseChatSessionOptions
	extends Omit<IChatSessionConfig, "endpoint"> {
	/** API endpoint for the chat */
	endpoint: string;
	/** Factory function to create the adapter */
	adapterFactory: ChatAdapterFactory;
}

/** @deprecated Use IUseChatSessionOptions instead */
export type UseChatSessionOptions = IUseChatSessionOptions;

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
export function useChatSession(options: IUseChatSessionOptions): IChatSession {
	const { endpoint, adapterFactory, ...configOptions } = options;

	const [messages, setMessages] = useState<IChatMessage[]>([]);
	const [status, setStatus] = useState<ChatStatus>("idle");
	const [error, setError] = useState<IChatError | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(
		configOptions.sessionId ?? null,
	);

	const adapterRef = useRef<IChatAdapter | null>(null);
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
		if (
			configOptions.sessionId !== undefined &&
			configOptions.sessionId !== ""
		) {
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
			if (!trimmedContent) {
				return;
			}

			lastUserMessageRef.current = trimmedContent;
			setError(null);
			setStatus("loading");

			// Add user message immediately
			const userMessage: IChatMessage = {
				id: `user-${String(Date.now())}`,
				role: "user",
				content: trimmedContent,
				createdAt: new Date(),
			};
			setMessages((prev) => [...prev, userMessage]);

			const config: IChatSessionConfig = {
				endpoint,
				sessionId: sessionId ?? undefined,
				...configOptionsRef.current,
			};

			const callbacks: IChatAdapterCallbacks = {
				onMessageStart: (messageId: string) => {
					currentAssistantIdRef.current = messageId;
					setStatus("streaming");
					// Add placeholder assistant message
					const assistantMessage: IChatMessage = {
						id: messageId,
						role: "assistant",
						content: "",
						createdAt: new Date(),
					};
					setMessages((prev) => [...prev, assistantMessage]);
				},
				onStreamingText: (text: string, messageId: string) => {
					setMessages((prev) =>
						prev.map((m) => (m.id === messageId ? { ...m, content: text } : m)),
					);
					configOptionsRef.current.onStreamingText?.(text, messageId);
				},
				onMessageComplete: (message: IChatMessage) => {
					setMessages((prev) =>
						prev.map((m) => (m.id === message.id ? message : m)),
					);
					setStatus("idle");
					currentAssistantIdRef.current = null;
					configOptionsRef.current.onMessage?.(message);
					configOptionsRef.current.onFinish?.(message);
				},
				onError: (err: IChatError) => {
					setError(err);
					setStatus("error");
					currentAssistantIdRef.current = null;
					configOptionsRef.current.onError?.(err);
				},
				onSessionId: (newSessionId: string) => {
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
		if (lastUserMessageRef.current === null) {
			return;
		}

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

	const setMessagesExternal = useCallback((newMessages: IChatMessage[]) => {
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
