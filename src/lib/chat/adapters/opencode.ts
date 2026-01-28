/**
 * OpenCode Adapter
 *
 * Implements streaming chat via the backend's SSE proxy endpoint.
 * The backend handles OpenCode communication and proxies events back.
 */

import type {
	ChatAdapter,
	ChatAdapterCallbacks,
	ChatMessage,
	ChatSessionConfig,
} from "../types";

/** SSE event types from our backend proxy */
interface ProxyEvent {
	sessionId?: string;
	messageId?: string;
	text?: string;
	error?: string;
}

/**
 * Creates an OpenCode adapter for streaming chat.
 * Uses the backend's /api/opencode/chat/stream SSE endpoint.
 */
export function createOpenCodeAdapter(): ChatAdapter {
	let abortController: AbortController | null = null;
	let currentSessionId: string | null = null;
	let currentMessageId: string | null = null;
	let fullContent = "";

	const send = (
		content: string,
		config: ChatSessionConfig,
		callbacks: ChatAdapterCallbacks,
	): void => {
		// Abort any existing request
		stop();
		abortController = new AbortController();

		const messageId = `msg-${Date.now()}`;
		currentMessageId = messageId;
		fullContent = "";
		callbacks.onMessageStart(messageId);

		const performRequest = async (): Promise<void> => {
			try {
				// Use the stream endpoint
				const streamEndpoint = config.endpoint.endsWith("/stream")
					? config.endpoint
					: `${config.endpoint}/stream`;

				const response = await fetch(streamEndpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...config.headers,
					},
					body: JSON.stringify({
						message: content,
						sessionId: config.sessionId ?? currentSessionId,
						directory: config.directory,
					}),
					signal: abortController?.signal,
				});

				if (!response.ok) {
					const errorText = await response.text();
					callbacks.onError({
						message: `Request failed: ${response.status}`,
						code: String(response.status),
						details: errorText,
					});
					return;
				}

				const reader = response.body?.getReader();
				if (!reader) {
					callbacks.onError({ message: "No response body" });
					return;
				}

				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						if (line.startsWith("event:")) {
							// Parse SSE event type
							continue;
						}

						if (line.startsWith("data:")) {
							const data = line.slice(5).trim();
							if (data === "" || data === "[DONE]") continue;

							try {
								const eventData = JSON.parse(data) as ProxyEvent;

								// Handle different event types based on presence of fields
								if (
									eventData.sessionId &&
									!eventData.text &&
									!eventData.error
								) {
									// Session event
									currentSessionId = eventData.sessionId;
									callbacks.onSessionId(eventData.sessionId);
								} else if (eventData.text !== undefined) {
									// Text event - accumulate content
									fullContent = eventData.text;
									callbacks.onStreamingText(
										fullContent,
										currentMessageId ?? messageId,
									);
								} else if (eventData.error) {
									// Error event
									callbacks.onError({ message: eventData.error });
									return;
								}
							} catch {
								// Not valid JSON, skip
							}
						}
					}
				}

				// Message complete
				const message: ChatMessage = {
					id: currentMessageId ?? messageId,
					role: "assistant",
					content: fullContent,
					createdAt: new Date(),
				};
				callbacks.onMessageComplete(message);
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				callbacks.onError({
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}
		};

		void performRequest();
	};

	const stop = (): void => {
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
	};

	const dispose = (): void => {
		stop();
		currentSessionId = null;
		currentMessageId = null;
	};

	return { send, stop, dispose };
}
