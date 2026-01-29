import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";

/**
 * Terminal viewport handle for parent component control
 */
export interface ITerminalViewportHandle {
	write: (data: string) => void;
	writeln: (data: string) => void;
	clear: () => void;
	focus: () => void;
	blur: () => void;
	scrollToBottom: () => void;
	fit: () => void;
}

interface ITerminalViewportProps {
	/** Called when data is received from user input */
	onData?: (data: string) => void;
	/** Called when terminal is resized */
	onResize?: (cols: number, rows: number) => void;
	/** Called when a link is clicked */
	onLinkClick?: (url: string) => void;
	/** Initial content to display */
	initialContent?: string;
	/** Whether the terminal is readonly (no input) */
	readonly?: boolean;
	/** Custom class name */
	className?: string;
}

/**
 * TerminalViewport - xterm.js wrapper component
 *
 * Provides a production-ready terminal viewport with:
 * - High-contrast theme using design tokens
 * - Smooth scrolling with inertia (mobile-native)
 * - Long-press text selection
 * - Web links support
 * - Unicode 11 support
 * - Auto-fit to container
 */
const TerminalViewport = forwardRef<
	ITerminalViewportHandle,
	ITerminalViewportProps
>(function TerminalViewport(
	{
		onData,
		onResize,
		onLinkClick,
		initialContent,
		readonly = false,
		className = "",
	},
	ref,
) {
	const containerRef = useRef<HTMLDivElement>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);

	// Initialize terminal
	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		// Get CSS custom properties for theming
		const computedStyle = getComputedStyle(document.documentElement);
		const getVar = (name: string, fallback: string) =>
			computedStyle.getPropertyValue(name).trim() || fallback;

		// Create terminal with design token colors
		const terminal = new Terminal({
			cursorBlink: true,
			cursorStyle: "block",
			fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
			fontSize: 14,
			lineHeight: 1.4,
			letterSpacing: 0,
			scrollback: 10000,
			smoothScrollDuration: 125,
			allowProposedApi: true,
			disableStdin: readonly,
			theme: {
				background: getVar("--terminal-bg", "#141414"),
				foreground: getVar("--terminal-fg", "#e5e5e5"),
				cursor: getVar("--terminal-cursor", "#4ade80"),
				cursorAccent: getVar("--terminal-bg", "#141414"),
				selectionBackground: getVar("--terminal-selection", "#3b4261"),
				selectionForeground: undefined,
				selectionInactiveBackground: getVar("--terminal-selection", "#3b4261"),
				black: getVar("--terminal-black", "#262626"),
				red: getVar("--terminal-red", "#ef4444"),
				green: getVar("--terminal-green", "#4ade80"),
				yellow: getVar("--terminal-yellow", "#facc15"),
				blue: getVar("--terminal-blue", "#3b82f6"),
				magenta: getVar("--terminal-magenta", "#c084fc"),
				cyan: getVar("--terminal-cyan", "#22d3ee"),
				white: getVar("--terminal-white", "#e5e5e5"),
				brightBlack: getVar("--terminal-bright-black", "#525252"),
				brightRed: getVar("--terminal-bright-red", "#f87171"),
				brightGreen: getVar("--terminal-bright-green", "#86efac"),
				brightYellow: getVar("--terminal-bright-yellow", "#fde047"),
				brightBlue: getVar("--terminal-bright-blue", "#60a5fa"),
				brightMagenta: getVar("--terminal-bright-magenta", "#d8b4fe"),
				brightCyan: getVar("--terminal-bright-cyan", "#67e8f9"),
				brightWhite: getVar("--terminal-bright-white", "#fafafa"),
			},
		});

		// Add addons
		const fitAddon = new FitAddon();
		const webLinksAddon = new WebLinksAddon((event, uri) => {
			event.preventDefault();
			if (onLinkClick) {
				onLinkClick(uri);
			} else {
				window.open(uri, "_blank", "noopener,noreferrer");
			}
		});
		const unicodeAddon = new Unicode11Addon();

		terminal.loadAddon(fitAddon);
		terminal.loadAddon(webLinksAddon);
		terminal.loadAddon(unicodeAddon);
		terminal.unicode.activeVersion = "11";

		// Open terminal in container
		terminal.open(containerRef.current);

		// Initial fit
		fitAddon.fit();

		// Store refs
		terminalRef.current = terminal;
		fitAddonRef.current = fitAddon;

		// Set up data handler
		if (onData) {
			terminal.onData(onData);
		}

		// Set up resize handler
		if (onResize) {
			terminal.onResize(({ cols, rows }) => {
				onResize(cols, rows);
			});
		}

		// Write initial content
		if (initialContent !== undefined && initialContent.length > 0) {
			terminal.write(initialContent);
		}

		// Handle container resize
		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				fitAddon.fit();
			});
		});
		resizeObserver.observe(containerRef.current);

		// Cleanup
		return () => {
			resizeObserver.disconnect();
			terminal.dispose();
		};
	}, [onData, onResize, onLinkClick, initialContent, readonly]);

	// Imperative handle for parent control
	useImperativeHandle(
		ref,
		() => ({
			write: (data: string) => {
				terminalRef.current?.write(data);
			},
			writeln: (data: string) => {
				terminalRef.current?.writeln(data);
			},
			clear: () => {
				terminalRef.current?.clear();
			},
			focus: () => {
				terminalRef.current?.focus();
			},
			blur: () => {
				terminalRef.current?.blur();
			},
			scrollToBottom: () => {
				terminalRef.current?.scrollToBottom();
			},
			fit: () => {
				fitAddonRef.current?.fit();
			},
		}),
		[],
	);

	// Handle mobile touch for text selection (long-press)
	const handleTouchStart = useCallback((_e: React.TouchEvent) => {
		// Allow default touch behavior for scrolling
		// Long-press selection is handled by xterm.js internally
	}, []);

	return (
		<div
			ref={containerRef}
			className={`terminal-viewport terminal-scrollbar w-full h-full min-h-0 overflow-hidden ${className}`}
			style={{
				background: "var(--terminal-bg, #141414)",
			}}
			onTouchStart={handleTouchStart}
			role="application"
			aria-label="Terminal"
		/>
	);
});

export default TerminalViewport;
