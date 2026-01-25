import { useCallback, useEffect, useRef, useState } from "react";
import { getTerminalApiUrl } from "@/utils/getTerminalApiUrl.ts";

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

	// Use refs for callbacks to avoid dependency array issues
	const onOutputRef = useRef(onOutput);
	const onCompleteRef = useRef(onComplete);
	const onErrorRef = useRef(onError);
	const onConnectionChangeRef = useRef(onConnectionChange);

	// Keep refs in sync
	useEffect(() => {
		onOutputRef.current = onOutput;
		onCompleteRef.current = onComplete;
		onErrorRef.current = onError;
		onConnectionChangeRef.current = onConnectionChange;
	});

	// Check connection status when credentials change
	useEffect(() => {
		const hasCredentials = Boolean(host && sshPrivateKey && accessToken);
		setIsConnected(hasCredentials);
		onConnectionChangeRef.current?.(
			hasCredentials ? "connected" : "disconnected",
		);
	}, [host, sshPrivateKey, accessToken]);

	/**
	 * Execute a command on the remote server
	 * Uses the direct /terminal/execute endpoint (not AI agent)
	 */
	const executeCommand = useCallback(
		async (command: string): Promise<ICommandResult> => {
			if (!host || !sshPrivateKey) {
				const error =
					"Terminal not connected. Configure SSH credentials in Infra tab.";
				onErrorRef.current?.(error);
				return { success: false, output: "", error };
			}

			// Cancel any pending request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();
			setIsExecuting(true);

			try {
				// Use the direct terminal execution endpoint (no AI)
				const response = await fetch(
					`${getTerminalApiUrl()}/terminal/execute`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(accessToken
								? { Authorization: `Bearer ${accessToken}` }
								: {}),
						},
						body: JSON.stringify({
							command,
							infraCredentials: {
								sshPrivateKey,
								host,
							},
						}),
						signal: abortControllerRef.current.signal,
					},
				);

				const data = await response.json();

				if (!response.ok) {
					const errorMessage =
						data.message || data.error || `Error ${response.status}`;
					throw new Error(errorMessage);
				}

				// Handle response
				const output = data.stdout || "";
				const stderr = data.stderr || "";

				if (output) {
					onOutputRef.current?.(output);
				}

				if (stderr && !data.success) {
					onErrorRef.current?.(stderr);
				}

				const result: ICommandResult = {
					success: data.success,
					output: output || stderr,
					error: data.success ? undefined : stderr,
				};

				onCompleteRef.current?.(data.success);
				return result;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return { success: false, output: "", error: "Command cancelled" };
				}

				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				onErrorRef.current?.(errorMessage);
				onCompleteRef.current?.(false);
				return { success: false, output: "", error: errorMessage };
			} finally {
				setIsExecuting(false);
				abortControllerRef.current = null;
			}
		},
		[host, sshPrivateKey, accessToken],
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
