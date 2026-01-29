import { useCallback } from "react";

interface ITerminalActionBarProps {
	/** Send "y\n" to PTY */
	onYes: () => void;
	/** Send "n\n" to PTY */
	onNo: () => void;
	/** Send Ctrl+C to PTY */
	onInterrupt: () => void;
	/** Send exit command or close process */
	onExit: () => void;
	/** Whether keyboard is currently visible (for mobile) */
	isKeyboardVisible?: boolean;
	/** Whether a process is running */
	isProcessRunning?: boolean;
}

/**
 * Action button component with consistent styling
 */
function ActionButton({
	label,
	onClick,
	variant,
	disabled = false,
}: {
	label: string;
	onClick: () => void;
	variant: "yes" | "no" | "interrupt" | "exit";
	disabled?: boolean;
}) {
	const variantStyles = {
		yes: {
			bg: "var(--terminal-btn-yes-bg)",
			bgHover: "var(--terminal-btn-yes-bg-hover)",
			bgActive: "var(--terminal-btn-yes-bg-active)",
			text: "var(--terminal-btn-yes-text)",
			border: "var(--terminal-btn-yes-border)",
		},
		no: {
			bg: "var(--terminal-btn-no-bg)",
			bgHover: "var(--terminal-btn-no-bg-hover)",
			bgActive: "var(--terminal-btn-no-bg-active)",
			text: "var(--terminal-btn-no-text)",
			border: "var(--terminal-btn-no-border)",
		},
		interrupt: {
			bg: "var(--terminal-btn-interrupt-bg)",
			bgHover: "var(--terminal-btn-interrupt-bg-hover)",
			bgActive: "var(--terminal-btn-interrupt-bg-active)",
			text: "var(--terminal-btn-interrupt-text)",
			border: "var(--terminal-btn-interrupt-border)",
		},
		exit: {
			bg: "var(--terminal-btn-exit-bg)",
			bgHover: "var(--terminal-btn-exit-bg-hover)",
			bgActive: "var(--terminal-btn-exit-bg-active)",
			text: "var(--terminal-btn-exit-text)",
			border: "var(--terminal-btn-exit-border)",
		},
	};

	const styles = variantStyles[variant];

	const handleClick = useCallback(() => {
		if (!disabled) {
			onClick();
		}
	}, [onClick, disabled]);

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={disabled}
			className="terminal-action-btn flex-1 flex items-center justify-center gap-1.5 border transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
			style={{
				background: styles.bg,
				color: styles.text,
				borderColor: styles.border,
				minHeight: "var(--terminal-action-btn-height)",
				minWidth: "var(--terminal-action-btn-min-width)",
				borderRadius: "var(--terminal-action-btn-radius)",
				fontSize: "var(--terminal-action-btn-font-size)",
				fontWeight: "var(--terminal-action-btn-font-weight)",
			}}
			onMouseEnter={(e) => {
				if (!disabled) {
					e.currentTarget.style.background = styles.bgHover;
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = styles.bg;
			}}
			onMouseDown={(e) => {
				if (!disabled) {
					e.currentTarget.style.background = styles.bgActive;
				}
			}}
			onMouseUp={(e) => {
				if (!disabled) {
					e.currentTarget.style.background = styles.bgHover;
				}
			}}
			aria-label={label}
		>
			{/* Icon based on variant */}
			{variant === "yes" && (
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<title>Confirm</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2.5}
						d="M5 13l4 4L19 7"
					/>
				</svg>
			)}
			{variant === "no" && (
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<title>Reject</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2.5}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			)}
			{variant === "interrupt" && (
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<title>Interrupt</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2.5}
						d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
					/>
				</svg>
			)}
			{variant === "exit" && (
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<title>Exit</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			)}
			<span className="hidden sm:inline">{label}</span>
		</button>
	);
}

/**
 * TerminalActionBar - Large, thumb-optimized action buttons
 *
 * Inspired by Termux-style mobile terminal UIs:
 * - YES: Confirms interactive prompts (writes "y\n" to PTY)
 * - NO: Rejects interactive prompts (writes "n\n" to PTY)
 * - INTERRUPT: Sends Ctrl+C to PTY
 * - EXIT: Sends exit command or closes current process
 *
 * Design requirements:
 * - Reachable with one thumb
 * - Works even when keyboard is open
 * - Never trigger confirmation modals
 * - Large, tactile touch targets (min 44px)
 */
export default function TerminalActionBar({
	onYes,
	onNo,
	onInterrupt,
	onExit,
	isKeyboardVisible = false,
	isProcessRunning = false,
}: ITerminalActionBarProps) {
	return (
		<div
			className={`flex items-center gap-2 px-3 py-2.5 shrink-0 ${
				isKeyboardVisible ? "pb-1" : ""
			}`}
			style={{
				background: "var(--terminal-composer-bg)",
				minHeight: "var(--terminal-thumb-zone-height)",
			}}
			role="toolbar"
			aria-label="Terminal actions"
		>
			<ActionButton label="YES" onClick={onYes} variant="yes" />
			<ActionButton label="NO" onClick={onNo} variant="no" />
			<ActionButton
				label="INTERRUPT"
				onClick={onInterrupt}
				variant="interrupt"
				disabled={!isProcessRunning}
			/>
			<ActionButton label="EXIT" onClick={onExit} variant="exit" />
		</div>
	);
}
