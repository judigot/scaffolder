import { useCallback, useEffect, useRef, useState } from "react";
import { getApiUrl } from "@/utils/getApiUrl.ts";

interface IUseTerminalExecutionOptions {
	/** SSH host to connect to */
	host?: string;
	/** SSH private key */
	sshPrivateKey?: string;
	/** Auth token for API */
	accessToken?: string;
	/** Called when output is received */
	onOutput?: (output: string) => void;
	/** Called when command completes */
	onComplete?: (success: boolean) => void;
	/** Called when error occurs */
	onError?: (error: string) => void;
	/** Called when connection status changes */
	onConnectionChange?: (status: "connected" | "disconnected") => void;
}

interface ICommandResult {
	success: boolean;
	output: string;
	error?: string;
}

/**
 * Hook for executing terminal commands via the existing API
 *
 * This uses the /api/agent/chat endpoint with a direct command execution prompt
 * to bypass AI interpretation and execute commands directly on the remote server.
 */
export function useTerminalExecution({
	host,
	sshPrivateKey,
	accessToken,
	onOutput,
	onComplete,
	onError,
	onConnectionChange,
}: IUseTerminalExecutionOptions) {
	const [isExecuting, setIsExecuting] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Check connection status when credentials change
	useEffect(() => {
		const hasCredentials = Boolean(host && sshPrivateKey && accessToken);
		setIsConnected(hasCredentials);
		onConnectionChange?.(hasCredentials ? "connected" : "disconnected");
	}, [host, sshPrivateKey, accessToken, onConnectionChange]);

	/**
	 * Execute a command on the remote server
	 */
	const executeCommand = useCallback(
		async (command: string): Promise<ICommandResult> => {
			if (!host || !sshPrivateKey) {
				const error = "Terminal not connected. Configure SSH credentials in Infra tab.";
				onError?.(error);
				return { success: false, output: "", error };
			}

			// Cancel any pending request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();
			setIsExecuting(true);

			try {
				// Use the existing agent/chat endpoint with a direct execution prompt
				// The prompt is designed to make the AI execute the command without interpretation
				const response = await fetch(`${getApiUrl()}/agent/chat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
					},
					body: JSON.stringify({
						messages: [
							{
								role: "user",
								content: `Execute this exact command without any modifications or explanations. Just run it and return only the output:\n\n\`\`\`bash\n${command}\n\`\`\``,
							},
						],
						infraCredentials: {
							sshPrivateKey,
							host,
						},
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`API error: ${response.status} - ${errorText}`);
				}

				// Handle streaming response
				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error("No response body");
				}

				const decoder = new TextDecoder();
				let fullOutput = "";
				let lastToolResult = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });

					// Parse SSE events from the AI SDK
					const lines = chunk.split("\n");
					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const data = JSON.parse(line.slice(6));

								// Extract tool results which contain actual command output
								if (data.type === "tool-result" && data.result) {
									const result = data.result;
									if (result.output) {
										lastToolResult = result.output;
										onOutput?.(result.output);
										fullOutput += result.output;
									}
									if (result.error) {
										onError?.(result.error);
									}
								}

								// Handle text deltas (AI's response)
								if (data.type === "text-delta" && data.textDelta) {
									// We skip AI commentary, only show tool output
								}
							} catch {
								// Not JSON, might be raw text
							}
						}
					}
				}

				const result: ICommandResult = {
					success: true,
					output: lastToolResult || fullOutput,
				};

				onComplete?.(true);
				return result;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return { success: false, output: "", error: "Command cancelled" };
				}

				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				onError?.(errorMessage);
				onComplete?.(false);
				return { success: false, output: "", error: errorMessage };
			} finally {
				setIsExecuting(false);
				abortControllerRef.current = null;
			}
		},
		[host, sshPrivateKey, accessToken, onOutput, onComplete, onError],
	);

	/**
	 * Cancel the current command execution
	 */
	const cancelExecution = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
			setIsExecuting(false);
		}
	}, []);

	return {
		executeCommand,
		cancelExecution,
		isExecuting,
		isConnected,
	};
}
