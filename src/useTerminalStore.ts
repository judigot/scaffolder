import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Terminal message status for reliability tracking
 * - pending: Command sent, waiting for ACK
 * - applied: Server confirmed command applied to PTY
 * - failed: Command failed, can be retried
 */
export type TerminalMessageStatus = "pending" | "applied" | "failed";

/**
 * Terminal connection states
 */
export type TerminalConnectionStatus =
	| "connected"
	| "reconnecting"
	| "disconnected";

/**
 * Terminal mode types (for mode indicator)
 */
export type TerminalModeType = "terminal" | "agent" | "ask";

/**
 * Secondary tab types for terminal top bar
 */
export type TerminalSecondaryTab = "terminal" | "files" | "preview" | "logs";

/**
 * Terminal message for history tracking
 */
export interface ITerminalMessage {
	id: string;
	content: string;
	timestamp: number;
	status: TerminalMessageStatus;
	retryCount: number;
}

/**
 * Terminal session for workspace persistence
 */
export interface ITerminalSession {
	workspaceId: string;
	sessionId: string;
	createdAt: number;
	lastActiveAt: number;
}

interface ITerminalStore {
	// Connection state
	connectionStatus: TerminalConnectionStatus;
	setConnectionStatus: (status: TerminalConnectionStatus) => void;

	// Current mode
	currentMode: TerminalModeType;
	setCurrentMode: (mode: TerminalModeType) => void;

	// Secondary tab
	activeSecondaryTab: TerminalSecondaryTab;
	setActiveSecondaryTab: (tab: TerminalSecondaryTab) => void;

	// Message history (for recall and reuse)
	messages: ITerminalMessage[];
	addMessage: (content: string) => string; // Returns message ID
	updateMessageStatus: (id: string, status: TerminalMessageStatus) => void;
	retryMessage: (id: string) => void;
	clearMessages: () => void;

	// Command history (for up/down navigation)
	commandHistory: string[];
	historyIndex: number;
	addToCommandHistory: (command: string) => void;
	navigateHistory: (direction: "up" | "down") => string | null;
	resetHistoryIndex: () => void;

	// Session management
	currentSession: ITerminalSession | null;
	setCurrentSession: (session: ITerminalSession | null) => void;

	// Terminal output buffer (for display purposes)
	outputBuffer: string[];
	appendOutput: (output: string) => void;
	clearOutput: () => void;

	// Input state
	currentInput: string;
	setCurrentInput: (input: string) => void;

	// PTY state
	isProcessRunning: boolean;
	setIsProcessRunning: (running: boolean) => void;

	// Gesture state
	isGestureActive: boolean;
	gestureDirection: "left" | "up" | "right" | null;
	setGestureState: (
		active: boolean,
		direction: "left" | "up" | "right" | null,
	) => void;
}

export const useTerminalStore = create<ITerminalStore>()(
	persist(
		(set, get) => ({
			// Connection state
			connectionStatus: "disconnected",
			setConnectionStatus: (status) => {
				set({ connectionStatus: status });
			},

			// Current mode
			currentMode: "terminal",
			setCurrentMode: (mode) => {
				set({ currentMode: mode });
			},

			// Secondary tab
			activeSecondaryTab: "terminal",
			setActiveSecondaryTab: (tab) => {
				set({ activeSecondaryTab: tab });
			},

			// Message history
			messages: [],
			addMessage: (content) => {
				const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
				const message: ITerminalMessage = {
					id,
					content,
					timestamp: Date.now(),
					status: "pending",
					retryCount: 0,
				};
				set((state) => ({
					messages: [...state.messages, message],
				}));
				return id;
			},
			updateMessageStatus: (id, status) => {
				set((state) => ({
					messages: state.messages.map((msg) =>
						msg.id === id ? { ...msg, status } : msg,
					),
				}));
			},
			retryMessage: (id) => {
				set((state) => ({
					messages: state.messages.map((msg) =>
						msg.id === id
							? { ...msg, status: "pending", retryCount: msg.retryCount + 1 }
							: msg,
					),
				}));
			},
			clearMessages: () => {
				set({ messages: [] });
			},

			// Command history
			commandHistory: [],
			historyIndex: -1,
			addToCommandHistory: (command) => {
				if (command.trim() === "") return;

				set((state) => {
					// Don't add duplicate of last command
					if (state.commandHistory[state.commandHistory.length - 1] === command) {
						return { historyIndex: -1 };
					}
					// Keep last 500 commands
					const newHistory = [...state.commandHistory, command].slice(-500);
					return { commandHistory: newHistory, historyIndex: -1 };
				});
			},
			navigateHistory: (direction) => {
				const state = get();
				const { commandHistory, historyIndex } = state;

				if (commandHistory.length === 0) return null;

				let newIndex: number;
				if (direction === "up") {
					newIndex =
						historyIndex === -1
							? commandHistory.length - 1
							: Math.max(0, historyIndex - 1);
				} else {
					newIndex =
						historyIndex === -1
							? -1
							: historyIndex >= commandHistory.length - 1
								? -1
								: historyIndex + 1;
				}

				set({ historyIndex: newIndex });
				return newIndex === -1 ? null : (commandHistory[newIndex] ?? null);
			},
			resetHistoryIndex: () => {
				set({ historyIndex: -1 });
			},

			// Session management
			currentSession: null,
			setCurrentSession: (session) => {
				set({ currentSession: session });
			},

			// Output buffer (non-persisted, used for display)
			outputBuffer: [],
			appendOutput: (output) => {
				set((state) => ({
					// Keep last 10000 lines
					outputBuffer: [...state.outputBuffer, output].slice(-10000),
				}));
			},
			clearOutput: () => {
				set({ outputBuffer: [] });
			},

			// Input state
			currentInput: "",
			setCurrentInput: (input) => {
				set({ currentInput: input });
			},

			// PTY state
			isProcessRunning: false,
			setIsProcessRunning: (running) => {
				set({ isProcessRunning: running });
			},

			// Gesture state
			isGestureActive: false,
			gestureDirection: null,
			setGestureState: (active, direction) => {
				set({ isGestureActive: active, gestureDirection: direction });
			},
		}),
		{
			name: "terminal-state",
			storage: createJSONStorage(() => localStorage),
			// Only persist certain fields
			partialize: (state) => ({
				commandHistory: state.commandHistory,
				currentMode: state.currentMode,
				activeSecondaryTab: state.activeSecondaryTab,
			}),
		},
	),
);
