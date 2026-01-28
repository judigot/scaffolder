import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";

type OpenCodeMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
};

type OpenCodeHealth = {
	connected: boolean;
	url?: string;
	version?: string;
	directory?: string;
	error?: string;
};

type OpenCodeChatPanelProps = {
	repoName?: string;
	repoPath?: string;
};

export default function OpenCodeChatPanel({
	repoName,
	repoPath,
}: OpenCodeChatPanelProps) {
	const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [directory, setDirectory] = useState("");
	const [health, setHealth] = useState<OpenCodeHealth>({ connected: false });
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		if (messages.length > 0) {
			scrollToBottom();
		}
	}, [messages.length, scrollToBottom]);

	useEffect(() => {
		if (repoPath) {
			setDirectory(repoPath);
		}
	}, [repoPath]);

	const refreshHealth = useCallback(async () => {
		try {
			const response = await fetch("/api/opencode/health");
			if (!response.ok) {
				const errorText = await response.text();
				setHealth({ connected: false, error: errorText });
				return;
			}
			const data = (await response.json()) as OpenCodeHealth;
			setHealth(data);
			if (!directory && data.directory) {
				setDirectory(data.directory);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "OpenCode unavailable";
			setHealth({ connected: false, error: message });
		}
	}, [directory]);

	useEffect(() => {
		void refreshHealth();
	}, [refreshHealth]);

	const statusBadge = useMemo(() => {
		if (health.connected) {
			return "Connected";
		}
		return "Disconnected";
	}, [health.connected]);

	const addMessage = useCallback((message: OpenCodeMessage) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	const updateLastAssistant = useCallback((content: string) => {
		setMessages((prev) => {
			const next = [...prev];
			for (let i = next.length - 1; i >= 0; i -= 1) {
				if (next[i]?.role === "assistant") {
					next[i] = { ...next[i], content };
					break;
				}
			}
			return next;
		});
	}, []);

	const handleSend = async (event: React.FormEvent) => {
		event.preventDefault();
		if (input.trim() === "" || isLoading) {
			return;
		}

		const userMessage: OpenCodeMessage = {
			id: `msg-${String(Date.now())}`,
			role: "user",
			content: input,
			timestamp: new Date(),
		};

		addMessage(userMessage);
		setInput("");

		const assistantMessage: OpenCodeMessage = {
			id: `msg-${String(Date.now() + 1)}`,
			role: "assistant",
			content: "",
			timestamp: new Date(),
		};
		addMessage(assistantMessage);

		setIsLoading(true);

		try {
			const response = await fetch("/api/opencode/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: userMessage.content,
					sessionId,
					directory,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				updateLastAssistant(`Error: ${errorText}`);
				return;
			}

			const data = (await response.json()) as {
				sessionId?: string;
				assistantText?: string;
			};

			if (data.sessionId) {
				setSessionId(data.sessionId);
			}

			updateLastAssistant(
				data.assistantText?.trim() || "(No response generated)",
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Request failed";
			updateLastAssistant(`Error: ${message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleNewSession = () => {
		setSessionId(null);
		setMessages([]);
	};

	return (
		<div className="flex-1 h-full bg-bg flex flex-col">
			<div className="px-4 py-3 border-b border-border bg-bg-subtle flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-sm font-semibold text-fg truncate">
						OpenCode (Local)
					</h2>
					<p className="text-xs text-fg-subtle truncate">
						{health.url ? `Server: ${health.url}` : "Server: not configured"}
						{health.version ? ` • v${health.version}` : ""}
					</p>
					{repoName && (
						<p className="text-xs text-fg-subtle truncate">
							Active repo: {repoName}
						</p>
					)}
				</div>
				<div className="flex items-center gap-2 flex-wrap justify-end">
					<span
						className={`text-xs font-semibold px-3 py-1 rounded-full border ${
							health.connected
								? "bg-success-900/40 text-success-300 border-success-600/40"
								: "bg-danger-900/40 text-danger-300 border-danger-600/40"
						}`}
					>
						{statusBadge}
					</span>
					<button
						type="button"
						className="px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-fg-muted hover:text-fg hover:bg-secondary-hover border border-border"
						onClick={() => {
							void refreshHealth();
						}}
					>
						Refresh
					</button>
					<button
						type="button"
						className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-900/40 text-primary-300 border border-primary-600/30"
						onClick={handleNewSession}
					>
						New session
					</button>
				</div>
			</div>

			<div className="px-4 py-2 border-b border-border bg-bg flex flex-wrap items-center gap-3">
				<label
					htmlFor="opencode-directory"
					className="text-xs font-semibold text-fg-subtle uppercase tracking-wide"
				>
					Directory
				</label>
				<input
					id="opencode-directory"
					type="text"
					value={directory}
					onChange={(event) => {
						setDirectory(event.target.value);
					}}
					placeholder="/path/to/project"
					className="flex-1 min-w-[220px] bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:outline-none"
				/>
				{health.error && (
					<span className="text-xs text-danger-300">{health.error}</span>
				)}
				{!health.error && !directory && (
					<span className="text-xs text-warning-300">
						Select a repo or enter a path.
					</span>
				)}
			</div>

			<div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
					>
						<div
							className={
								message.role === "user"
									? "max-w-[85%] px-5 py-3 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-primary-600 to-primary-700 text-fg shadow-lg shadow-primary-900/20 text-sm leading-relaxed"
									: "max-w-[85%] px-2 py-2 text-fg text-sm leading-relaxed"
							}
						>
							{message.role === "user" ? (
								message.content
							) : (
								<div className="prose prose-invert prose-sm max-w-none">
									<Markdown
										components={{
											a: ({ children, href }) => (
												<a
													href={href}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary-400 hover:text-primary-300 underline break-all"
												>
													{children}
												</a>
											),
											code: ({ children, className }) => {
												const isInline = !className;
												return isInline ? (
													<code className="bg-secondary px-1.5 py-0.5 rounded text-xs">
														{children}
													</code>
												) : (
													<code className={className}>{children}</code>
												);
											},
										}}
									>
										{message.content}
									</Markdown>
								</div>
							)}
						</div>
					</div>
				))}
				{isLoading && (
					<div className="flex justify-start pl-2">
						<div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			<form
				onSubmit={handleSend}
				className="border-t border-border bg-bg-subtle px-4 py-3"
			>
				<div className="flex items-center gap-3 bg-secondary border border-border rounded-full px-4 py-2">
					<input
						type="text"
						value={input}
						onChange={(event) => {
							setInput(event.target.value);
						}}
						placeholder="Describe what you want OpenCode to do..."
						className="flex-1 bg-transparent text-fg placeholder-fg-subtle focus:outline-none text-sm"
						disabled={!health.connected || isLoading}
					/>
					<button
						type="submit"
						disabled={!health.connected || isLoading || input.trim() === ""}
						className="h-9 w-9 rounded-full bg-fg text-bg flex items-center justify-center disabled:opacity-30"
					>
						{isLoading ? (
							<svg
								className="w-4 h-4 animate-spin"
								viewBox="0 0 24 24"
								fill="none"
							>
								<title>Loading</title>
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
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<title>Send</title>
								<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
							</svg>
						)}
					</button>
				</div>
				<p className="text-[11px] text-fg-subtle mt-2 text-center">
					OpenCode runs locally. Set OPENCODE_URL to connect.
				</p>
			</form>
		</div>
	);
}
