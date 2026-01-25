import { useCallback, useRef, useState } from "react";
import { useTerminalStore } from "@/useTerminalStore.ts";
import TerminalActionBar from "./TerminalActionBar.tsx";
import TerminalComposer from "./TerminalComposer.tsx";
import TerminalModeIndicator from "./TerminalModeIndicator.tsx";
import TerminalTopBar from "./TerminalTopBar.tsx";
import TerminalViewport, {
	type ITerminalViewportHandle,
} from "./TerminalViewport.tsx";
import { useTerminalGestures } from "./useTerminalGestures.ts";

interface ITerminalModeProps {
	/** SSH connection host */
	host?: string;
	/** SSH private key for connection */
	sshPrivateKey?: string;
	/** Access token for API calls */
	accessToken?: string;
	/** Called when terminal requests navigation */
	onNavigate?: (direction: "back" | "forward") => void;
	/** Called when terminal wants to show history */
	onShowHistory?: () => void;
}

/**
 * TerminalMode - Primary Runtime Interface
 *
 * A serious, mobile-first terminal experience where the chat composer
 * acts as the terminal input, optimized for thumb-coding and capable
 * of competing with Warp Terminal.
 *
 * Features:
 * - Large, high-contrast terminal viewport
 * - Dedicated, thumb-reachable action buttons (YES/NO/INTERRUPT/EXIT)
 * - Gesture-assisted navigation (swipe left/up/right)
 * - Clear separation between terminal output and control surface
 *
 * Interaction Rules:
 * - ALL user input routes to the terminal
 * - No natural-language interpretation
 * - No auto-detection of intent
 * - What the user types is exactly what the terminal receives
 */
export default function TerminalMode({
	host,
	sshPrivateKey: _sshPrivateKey,
	accessToken: _accessToken,
	onNavigate,
	onShowHistory,
}: ITerminalModeProps) {
	const terminalRef = useRef<ITerminalViewportHandle>(null);

	// Terminal store state
	const {
		connectionStatus,
		setConnectionStatus: _setConnectionStatus,
		currentMode,
		activeSecondaryTab,
		setActiveSecondaryTab,
		currentInput,
		setCurrentInput,
		addMessage,
		updateMessageStatus,
		addToCommandHistory,
		navigateHistory,
		resetHistoryIndex,
		isProcessRunning,
		setIsProcessRunning,
	} = useTerminalStore();

	// Local state for pending message
	const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

	// Gesture handlers
	const { gestureState, handlers: gestureHandlers } = useTerminalGestures({
		onSwipeLeft: () => {
			onNavigate?.("back");
		},
		onSwipeRight: () => {
			onNavigate?.("forward");
		},
		onSwipeUp: () => {
			onShowHistory?.();
		},
		enabled: true,
	});

	// Send command to terminal
	const sendCommand = useCallback(
		async (command: string) => {
			if (!command.trim()) return;

			// Add to message history with pending status
			const messageId = addMessage(command);
			setPendingMessageId(messageId);

			// Add to command history
			addToCommandHistory(command);
			resetHistoryIndex();

			// Clear input
			setCurrentInput("");

			// Write to terminal viewport
			terminalRef.current?.writeln(`$ ${command}`);

			try {
				// TODO: Send to actual PTY via WebSocket/API
				// For now, simulate sending to server
				setIsProcessRunning(true);

				// Simulate response (replace with actual API call)
				await new Promise((resolve) => setTimeout(resolve, 500));

				// Mark as applied
				updateMessageStatus(messageId, "applied");

				// Simulate command output
				terminalRef.current?.writeln("Command executed successfully.");
				terminalRef.current?.writeln("");
			} catch (error) {
				// Mark as failed
				updateMessageStatus(messageId, "failed");
				terminalRef.current?.writeln(
					`\x1b[31mError: ${error instanceof Error ? error.message : "Command failed"}\x1b[0m`,
				);
			} finally {
				setIsProcessRunning(false);
				setPendingMessageId(null);
			}
		},
		[
			addMessage,
			addToCommandHistory,
			resetHistoryIndex,
			setCurrentInput,
			setIsProcessRunning,
			updateMessageStatus,
		],
	);

	// Handle YES button (send "y\n")
	const handleYes = useCallback(() => {
		terminalRef.current?.write("y\n");
		// TODO: Send to PTY
	}, []);

	// Handle NO button (send "n\n")
	const handleNo = useCallback(() => {
		terminalRef.current?.write("n\n");
		// TODO: Send to PTY
	}, []);

	// Handle INTERRUPT button (send Ctrl+C)
	const handleInterrupt = useCallback(() => {
		terminalRef.current?.write("\x03"); // Ctrl+C
		setIsProcessRunning(false);
		// TODO: Send to PTY
	}, [setIsProcessRunning]);

	// Handle EXIT button
	const handleExit = useCallback(() => {
		terminalRef.current?.writeln("exit");
		// TODO: Send exit command to PTY
	}, []);

	// Handle terminal data (from xterm)
	const handleTerminalData = useCallback((_data: string) => {
		// In terminal mode, we don't process xterm input directly
		// All input goes through the composer for better mobile UX
		// Future: May be used for direct keyboard input on desktop
	}, []);

	// Handle history navigation
	const handleHistoryUp = useCallback(() => {
		return navigateHistory("up");
	}, [navigateHistory]);

	const handleHistoryDown = useCallback(() => {
		return navigateHistory("down");
	}, [navigateHistory]);

	// Initialize connection on mount
	// useEffect(() => {
	// 	if (host && sshPrivateKey && accessToken) {
	// 		// TODO: Establish WebSocket connection to PTY backend
	// 		setConnectionStatus("connected");
	// 	} else {
	// 		setConnectionStatus("disconnected");
	// 	}
	// }, [host, sshPrivateKey, accessToken, setConnectionStatus]);

	return (
		<div
			className="flex flex-col h-full w-full overflow-hidden"
			style={{ background: "var(--terminal-bg)" }}
			{...gestureHandlers}
		>
			{/* Gesture indicator overlay */}
			{gestureState.isActive && gestureState.direction && (
				<div
					className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
					style={{
						background: `rgba(59, 130, 246, ${gestureState.progress * 0.2})`,
					}}
				>
					<div
						className="px-6 py-3 rounded-full text-white font-medium text-sm"
						style={{
							background: "var(--terminal-gesture-indicator-bg)",
							border: "1px solid var(--terminal-gesture-indicator-border)",
							opacity: gestureState.progress,
							transform: `scale(${0.8 + gestureState.progress * 0.2})`,
						}}
					>
						{gestureState.direction === "left" && "Back"}
						{gestureState.direction === "right" && "Forward"}
						{gestureState.direction === "up" && "History"}
					</div>
				</div>
			)}

			{/* Top Bar */}
			<TerminalTopBar
				connectionStatus={connectionStatus}
				activeTab={activeSecondaryTab}
				onTabChange={setActiveSecondaryTab}
				host={host}
			/>

			{/* Main Terminal Viewport */}
			<div className="flex-1 min-h-0 overflow-hidden relative">
				{activeSecondaryTab === "terminal" && (
					<TerminalViewport
						ref={terminalRef}
						onData={handleTerminalData}
						readonly={false}
						className="h-full"
					/>
				)}
				{activeSecondaryTab === "files" && (
					<div className="h-full flex items-center justify-center text-neutral-500">
						<div className="text-center">
							<svg
								className="w-12 h-12 mx-auto mb-3 opacity-50"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Files</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
							<p className="text-sm">File browser coming soon</p>
						</div>
					</div>
				)}
				{activeSecondaryTab === "preview" && (
					<div className="h-full flex items-center justify-center text-neutral-500">
						<div className="text-center">
							<svg
								className="w-12 h-12 mx-auto mb-3 opacity-50"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Preview</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
							<p className="text-sm">Preview coming soon</p>
						</div>
					</div>
				)}
				{activeSecondaryTab === "logs" && (
					<div className="h-full flex items-center justify-center text-neutral-500">
						<div className="text-center">
							<svg
								className="w-12 h-12 mx-auto mb-3 opacity-50"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Logs</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<p className="text-sm">Logs coming soon</p>
						</div>
					</div>
				)}
			</div>

			{/* Mode Indicator Bar */}
			<TerminalModeIndicator currentMode={currentMode} interactive={false} />

			{/* Action Buttons */}
			<TerminalActionBar
				onYes={handleYes}
				onNo={handleNo}
				onInterrupt={handleInterrupt}
				onExit={handleExit}
				isProcessRunning={isProcessRunning}
			/>

			{/* Terminal Composer (Input) */}
			<TerminalComposer
				value={currentInput}
				onChange={setCurrentInput}
				onSubmit={sendCommand}
				onHistoryUp={handleHistoryUp}
				onHistoryDown={handleHistoryDown}
				isPending={pendingMessageId !== null}
			/>
		</div>
	);
}
