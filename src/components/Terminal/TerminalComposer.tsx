import { useCallback, useEffect, useRef, useState } from "react";

interface ITerminalComposerProps {
	/** Current input value */
	value: string;
	/** Called when input value changes */
	onChange: (value: string) => void;
	/** Called when user submits (Enter or Send button) */
	onSubmit: (value: string) => void;
	/** Called when user presses Up arrow (history navigation) */
	onHistoryUp?: () => string | null;
	/** Called when user presses Down arrow (history navigation) */
	onHistoryDown?: () => string | null;
	/** Whether input is disabled */
	disabled?: boolean;
	/** Placeholder text */
	placeholder?: string;
	/** Whether a command is currently pending */
	isPending?: boolean;
}

/**
 * TerminalComposer - Chat-style input for terminal commands
 *
 * This is the ONLY input method in Terminal Mode.
 * - Pressing Send appends text as user message (for history)
 * - Writes the exact text + newline to PTY stdin
 * - Enter = Send
 * - Shift+Enter = newline
 * - Up/Down arrows navigate command history
 *
 * Design:
 * - Always visible at the bottom
 * - Placeholder: "Send to terminal..."
 * - Mobile-optimized with large touch targets
 */
export default function TerminalComposer({
	value,
	onChange,
	onSubmit,
	onHistoryUp,
	onHistoryDown,
	disabled = false,
	placeholder = "Send to terminal...",
	isPending = false,
}: ITerminalComposerProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [isComposing, setIsComposing] = useState(false);
	const [savedInput, setSavedInput] = useState<string | null>(null);

	// Auto-resize textarea
	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			const maxHeight = 160;
			const newHeight = Math.min(textarea.scrollHeight, maxHeight);
			textarea.style.height = `${String(newHeight)}px`;
			textarea.style.overflowY =
				textarea.scrollHeight > maxHeight ? "auto" : "hidden";
		}
	}, []);

	useEffect(() => {
		adjustHeight();
	}, [value, adjustHeight]);

	// Handle key events
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Don't handle during IME composition
			if (isComposing) {return;}

			// Enter without Shift = Submit
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (value.trim() && !disabled) {
					onSubmit(value);
				}
				return;
			}

			// Up arrow = Previous command in history
			if (e.key === "ArrowUp" && onHistoryUp) {
				// Only navigate history if cursor is at start or input is empty
				const textarea = e.currentTarget;
				if (textarea.selectionStart === 0 || value === "") {
					e.preventDefault();
					// Save current input first time
					if (savedInput === null) {
						setSavedInput(value);
					}
					const historyCommand = onHistoryUp();
					if (historyCommand !== null) {
						onChange(historyCommand);
					}
				}
				return;
			}

			// Down arrow = Next command in history
			if (e.key === "ArrowDown" && onHistoryDown) {
				const textarea = e.currentTarget;
				// Only navigate if cursor is at end or input is from history
				if (textarea.selectionEnd === value.length) {
					e.preventDefault();
					const historyCommand = onHistoryDown();
					if (historyCommand !== null) {
						onChange(historyCommand);
					} else if (savedInput !== null) {
						// Restore original input when reaching end of history
						onChange(savedInput);
						setSavedInput(null);
					}
				}
				return;
			}

			// Reset saved input on any other key
			if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
				setSavedInput(null);
			}
		},
		[
			value,
			disabled,
			isComposing,
			onSubmit,
			onHistoryUp,
			onHistoryDown,
			onChange,
			savedInput,
		],
	);

	// Handle form submission
	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (value.trim() && !disabled) {
				onSubmit(value);
				setSavedInput(null);
			}
		},
		[value, disabled, onSubmit],
	);

	return (
		<div
			className="shrink-0 px-3 py-3"
			style={{
				background: "var(--terminal-composer-bg)",
				borderTop: "1px solid var(--terminal-composer-input-border)",
			}}
		>
			<form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
				<div
					className="flex items-end gap-2 rounded-2xl px-4 py-2.5 transition-colors"
					style={{
						background: "var(--terminal-composer-input-bg)",
						border: "1px solid var(--terminal-composer-input-border)",
					}}
				>
					{/* Terminal prompt indicator */}
					<span
						className="text-sm font-mono shrink-0 pb-1"
						style={{ color: "var(--terminal-output-prompt-color)" }}
						aria-hidden="true"
					>
						$
					</span>

					{/* Textarea input */}
					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => {
							onChange(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => {
							setIsComposing(true);
						}}
						onCompositionEnd={() => {
							setIsComposing(false);
						}}
						placeholder={placeholder}
						disabled={disabled}
						rows={1}
						className="flex-1 bg-transparent resize-none focus:outline-none disabled:opacity-50 text-sm font-mono leading-relaxed py-1 min-h-[24px]"
						style={{
							color: "var(--terminal-composer-text)",
							overflow: "hidden",
						}}
						aria-label="Terminal input"
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
					/>

					{/* Send button */}
					<button
						type="submit"
						disabled={disabled || !value.trim()}
						className="p-2 rounded-full transition-colors shrink-0 disabled:cursor-not-allowed touch-manipulation"
						style={{
							background:
								disabled || !value.trim()
									? "var(--terminal-composer-send-disabled)"
									: "var(--terminal-composer-send-bg)",
							color: "var(--terminal-composer-send-text)",
							minWidth: "var(--terminal-touch-target-min)",
							minHeight: "var(--terminal-touch-target-min)",
						}}
						onMouseEnter={(e) => {
							if (!disabled && value.trim()) {
								e.currentTarget.style.background =
									"var(--terminal-composer-send-bg-hover)";
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background =
								disabled || !value.trim()
									? "var(--terminal-composer-send-disabled)"
									: "var(--terminal-composer-send-bg)";
						}}
						aria-label="Send command"
					>
						{isPending ? (
							<svg
								className="animate-spin w-5 h-5"
								fill="none"
								viewBox="0 0 24 24"
							>
								<title>Sending...</title>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
						) : (
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Send</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 5l7 7-7 7M5 5l7 7-7 7"
								/>
							</svg>
						)}
					</button>
				</div>

				{/* Helper text */}
				<div
					className="flex items-center justify-between mt-1.5 px-1 text-xs"
					style={{ color: "var(--terminal-composer-placeholder)" }}
				>
					<span>
						<kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-xs">
							Enter
						</kbd>{" "}
						to send
					</span>
					<span>
						<kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-xs">
							Shift+Enter
						</kbd>{" "}
						for newline
					</span>
				</div>
			</form>
		</div>
	);
}
