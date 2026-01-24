import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface IRemoteAgentChatProps {
	sshPrivateKey: string;
	host: string;
}

interface IToolInvocationPart {
	type: "tool-invocation";
	toolInvocation: {
		toolName: string;
		args: Record<string, unknown>;
		state: "call" | "result" | "partial-call";
		result?: {
			success?: boolean;
			output?: string;
			error?: string;
		};
	};
}

function ToolCallDisplay({ part }: { part: IToolInvocationPart }) {
	const { toolName, args, state, result } = part.toolInvocation;
	const [isExpanded, setIsExpanded] = useState(false);

	const getToolIcon = (name: string) => {
		switch (name) {
			case "execute_command":
				return "$";
			case "read_file":
				return ">";
			case "write_file":
				return "+";
			case "list_directory":
				return "#";
			default:
				return "*";
		}
	};

	const getToolLabel = (name: string) => {
		switch (name) {
			case "execute_command":
				return "Command";
			case "read_file":
				return "Read";
			case "write_file":
				return "Write";
			case "list_directory":
				return "List";
			default:
				return name;
		}
	};

	const getCommandSummary = () => {
		if (toolName === "execute_command" && typeof args.command === "string") {
			return args.command.length > 80
				? `${args.command.substring(0, 80)}...`
				: args.command;
		}
		if (
			(toolName === "read_file" || toolName === "write_file") &&
			typeof args.path === "string"
		) {
			return args.path;
		}
		if (toolName === "list_directory" && typeof args.path === "string") {
			return args.path;
		}
		return JSON.stringify(args);
	};

	const isRunning = state === "call" || state === "partial-call";
	const hasResult = state === "result" && result !== undefined;
	const isSuccess = hasResult && result.success === true;

	return (
		<div className="my-2 border border-border rounded-lg overflow-hidden bg-bg-muted">
			<button
				type="button"
				onClick={() => {
					setIsExpanded(!isExpanded);
				}}
				className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary-hover transition-colors"
			>
				<span className="flex items-center justify-center w-6 h-6 rounded bg-secondary text-fg-muted text-xs font-mono shrink-0">
					{getToolIcon(toolName)}
				</span>
				<span className="text-xs font-medium text-fg-muted shrink-0">
					{getToolLabel(toolName)}
				</span>
				<span className="text-xs text-fg-subtle font-mono truncate flex-1 min-w-0">
					{getCommandSummary()}
				</span>
				{isRunning && (
					<span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse shrink-0" />
				)}
				{hasResult && (
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${isSuccess ? "bg-success-500" : "bg-danger-500"}`}
					/>
				)}
				<svg
					className={`w-3 h-3 text-fg-muted transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Toggle</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{isExpanded && (
				<div className="border-t border-border px-3 py-2 space-y-2">
					{toolName === "execute_command" &&
						typeof args.command === "string" && (
							<div>
								<p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">
									Command
								</p>
								<pre className="text-xs text-fg font-mono bg-secondary rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
									{args.command}
								</pre>
							</div>
						)}
					{(toolName === "read_file" || toolName === "list_directory") &&
						typeof args.path === "string" && (
							<div>
								<p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">
									Path
								</p>
								<p className="text-xs text-fg font-mono">{args.path}</p>
							</div>
						)}
					{toolName === "write_file" && typeof args.path === "string" && (
						<div>
							<p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">
								File
							</p>
							<p className="text-xs text-fg font-mono">{args.path}</p>
						</div>
					)}
					{hasResult && (
						<div>
							<p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">
								{isSuccess ? "Output" : "Error"}
							</p>
							<pre
								className={`text-xs font-mono rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto ${
									isSuccess
										? "text-fg bg-secondary"
										: "text-danger-300 bg-danger-900/20"
								}`}
							>
								{isSuccess
									? result.output ?? "(no output)"
									: result.error ?? "Unknown error"}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function AgentMessage({ message }: { message: UIMessage }) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={
					isUser
						? "max-w-[85%] md:max-w-3xl px-4 py-3 md:px-6 md:py-4 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-fg shadow-lg shadow-primary-900/20"
						: "max-w-[95%] md:max-w-3xl px-2 py-2 text-fg w-full"
				}
			>
				<div className="prose prose-invert max-w-none text-sm md:text-base">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							return (
								<Markdown
									key={`text-${message.id}-${String(index)}`}
									components={{
										code(props) {
											const { children, className, ...rest } = props;
											const match = /language-(\w+)/.exec(className ?? "");
											return match ? (
												<SyntaxHighlighter
													PreTag="div"
													language={match[1]}
													style={oneDark}
													customStyle={{
														margin: 0,
														borderRadius: "0.5rem",
														fontSize: "var(--font-size-sm)",
													}}
												>
													{String(children).replace(/\n$/, "")}
												</SyntaxHighlighter>
											) : (
												<code {...rest} className={className}>
													{children}
												</code>
											);
										},
									}}
								>
									{part.text}
								</Markdown>
							);
						}
						if (part.type === "tool-invocation") {
							return (
								<ToolCallDisplay
									key={`tool-${message.id}-${String(index)}`}
									part={part as unknown as IToolInvocationPart}
								/>
							);
						}
						return null;
					})}
				</div>
			</div>
		</div>
	);
}

function AgentEmptyState() {
	return (
		<div className="flex-1 flex items-center justify-center p-6">
			<div className="text-center max-w-md space-y-4">
				<div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-800/20 border border-primary-700/30 flex items-center justify-center">
					<svg
						className="w-8 h-8 text-primary-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Terminal</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<div>
					<h3 className="text-lg font-semibold text-fg">Remote Agent</h3>
					<p className="text-sm text-fg-subtle mt-1">
						Connected to your EC2 instance. Ask me to set up projects, run
						commands, edit files, or manage your server.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-2 text-left">
					<div className="p-3 bg-bg-muted border border-border rounded-lg">
						<p className="text-xs font-medium text-fg-muted">Try saying:</p>
						<p className="text-sm text-fg mt-1">
							"Set up a Node.js project in ~/app"
						</p>
					</div>
					<div className="p-3 bg-bg-muted border border-border rounded-lg">
						<p className="text-xs font-medium text-fg-muted">Or:</p>
						<p className="text-sm text-fg mt-1">
							"Show me what's running on this server"
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function RemoteAgentChat({
	sshPrivateKey,
	host,
}: IRemoteAgentChatProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [input, setInput] = useState("");

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/agent/chat",
				body: {
					infraCredentials: {
						sshPrivateKey,
						host,
					},
				},
			}),
		[sshPrivateKey, host],
	);

	const { messages, sendMessage, status, error, stop } = useChat({
		transport,
	});

	const isLoading = status === "streaming" || status === "submitted";

	useEffect(() => {
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

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
	}, [input, adjustHeight]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim().length > 0 && !isLoading) {
			void sendMessage({ text: input });
			setInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				handleSubmit(e);
			}
		}
	};

	const reload = () => {
		if (messages.length > 0) {
			stop();
			const lastUserMessage = [...messages]
				.reverse()
				.find((m) => m.role === "user");
			const firstPart = lastUserMessage?.parts[0];
			if (firstPart && firstPart.type === "text") {
				void sendMessage({ text: firstPart.text });
			}
		}
	};

	return (
		<div className="flex flex-col h-full bg-bg">
			{/* Header */}
			<div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-3">
				<div className="flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-success-500" />
					<span className="text-sm font-medium text-fg">Remote Agent</span>
				</div>
				<span className="text-xs text-fg-subtle font-mono">{host}</span>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
				<div className="max-w-5xl mx-auto px-3 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 space-y-3 md:space-y-4">
					{messages.length === 0 && <AgentEmptyState />}
					{messages.map((message) => (
						<AgentMessage key={message.id} message={message} />
					))}
					{isLoading &&
						messages.length > 0 &&
						messages[messages.length - 1]?.role === "user" && (
							<div className="flex justify-start pl-2">
								<div className="flex items-center gap-2 text-fg-subtle text-sm">
									<span className="inline-flex gap-1">
										<span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:0ms]" />
										<span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:150ms]" />
										<span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:300ms]" />
									</span>
								</div>
							</div>
						)}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Error display */}
			{error && (
				<div className="mx-3 mb-2 md:mx-6">
					<div className="max-w-5xl mx-auto p-3 bg-danger-900/20 border border-danger-700/40 rounded-lg flex items-center justify-between gap-3">
						<p className="text-xs text-danger-200 truncate">
							{error.message || "Connection error"}
						</p>
						<button
							type="button"
							onClick={reload}
							className="text-xs px-3 py-1.5 bg-danger-800/40 hover:bg-danger-700/40 text-danger-200 rounded transition-colors shrink-0"
						>
							Retry
						</button>
					</div>
				</div>
			)}

			{/* Input */}
			<div className="shrink-0 border-t border-border bg-bg p-3 md:p-4">
				<form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
					<div className="flex items-end gap-2 bg-secondary border border-border rounded-full px-3 py-2">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
							}}
							onKeyDown={handleKeyDown}
							placeholder="Ask the agent to run commands, edit files..."
							disabled={isLoading}
							rows={1}
							className="flex-1 bg-transparent text-fg resize-none focus:outline-none disabled:opacity-50 placeholder-fg-subtle text-sm md:text-base leading-relaxed py-1.5 min-h-[28px]"
							style={{ overflow: "hidden" }}
						/>
						<button
							type="submit"
							disabled={isLoading || !input.trim()}
							className="p-1.5 bg-fg text-bg rounded-full hover:bg-fg-muted focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
						>
							{isLoading ? (
								<svg
									className="animate-spin w-5 h-5"
									fill="none"
									viewBox="0 0 24 24"
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
										d="M5 15l7-7 7 7"
									/>
								</svg>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
