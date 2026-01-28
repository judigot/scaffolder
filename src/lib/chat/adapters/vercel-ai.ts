/**
 * Vercel AI SDK Adapter
 *
 * Wraps the Vercel AI SDK's useChat hook to conform to our ChatAdapter interface.
 * This adapter is used for direct LLM provider calls (OpenAI, Anthropic, etc.)
 */

import type {
	ChatAdapter,
	ChatAdapterCallbacks,
	ChatMessage,
	ChatSessionConfig,
} from "../types";

/**
 * Creates a Vercel AI SDK adapter for streaming chat.
 * Uses fetch with SSE parsing to stream responses from Vercel AI SDK compatible endpoints.
 */
export function createVercelAIAdapter(): ChatAdapter {
	let abortController: AbortController | null = null;

	const send = (
		content: string,
		config: ChatSessionConfig,
		callbacks: ChatAdapterCallbacks,
	): void => {
		// Abort any existing request
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();

		const messageId = `msg-${Date.now()}`;
		callbacks.onMessageStart(messageId);

		let fullContent = "";

		const performRequest = async (): Promise<void> => {
			try {
				const response = await fetch(config.endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...config.headers,
					},
					body: JSON.stringify({
						messages: [{ role: "user", content }],
						model: config.model,
						...(config.systemPrompt && { system: config.systemPrompt }),
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

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split("\n");

					for (const line of lines) {
						if (line.startsWith("0:")) {
							// Vercel AI SDK text stream format: 0:"text content"
							try {
								const text = JSON.parse(line.slice(2)) as string;
								fullContent += text;
								callbacks.onStreamingText(fullContent, messageId);
							} catch {
								// Not valid JSON, skip
							}
						} else if (line.startsWith("d:")) {
							// Done message
							break;
						}
					}
				}

				const message: ChatMessage = {
					id: messageId,
					role: "assistant",
					content: fullContent,
					createdAt: new Date(),
				};

				callbacks.onMessageComplete(message);
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					// Request was aborted, not an error
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
	};

	return { send, stop, dispose };
}
