import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { ModelId } from "@/components/AI/AIChatContainer.tsx";
import { ModelSelector } from "@/components/AI/AIChatContainer.tsx";
import type { IChat, IMessage } from "@/components/AI/chat-app/types.ts";
import Badge from "@/components/AI/chat-app/ui/Badge.tsx";
import IconButton from "@/components/AI/chat-app/ui/IconButton.tsx";

interface IChatPanelProps {
	chat: IChat | null;
	repositoryName: string;
	sprintName: string;
	onSendMessage: (chatId: string, content: string, model: ModelId) => void;
	onPromoteChat: (chatId: string) => void;
	onMarkReady: (chatId: string) => void;
}

export default function ChatPanel({
	chat,
	repositoryName,
	sprintName,
	onSendMessage,
	onPromoteChat,
	onMarkReady,
}: IChatPanelProps) {
	const [input, setInput] = useState("");
	const [selectedModel, setSelectedModel] = useState<ModelId>("gpt-5-nano");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const messageCount = chat?.messages.length ?? 0;

	useEffect(() => {
		if (messageCount > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messageCount]);

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (!chat || input.trim() === "") {
			return;
		}
		onSendMessage(chat.id, input, selectedModel);
		setInput("");
	};

	if (!chat) {
		return (
			<div className="flex-1 h-full bg-bg flex items-center justify-center p-6">
				<div className="max-w-md text-center space-y-3">
					<div className="w-16 h-16 mx-auto rounded-2xl bg-secondary border border-border flex items-center justify-center text-fg-subtle">
						<svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
							<title>Main branch</title>
							<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-fg">Main branch active</h3>
					<p className="text-sm text-fg-subtle">
						Select a chat to switch to a feature branch or start a new task.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 h-full bg-bg flex flex-col">
			<div className="px-4 py-3 border-b border-border bg-bg-subtle flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-sm font-semibold text-fg truncate">
						{chat.title}
					</h2>
					<p className="text-xs text-fg-subtle truncate">
						{repositoryName} • {sprintName} • {chat.messages.length} messages
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap justify-end">
					{chat.prStatus === null && (
						<button
							type="button"
							className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-900/40 text-primary-300 border border-primary-600/30"
							onClick={() => {
								onPromoteChat(chat.id);
							}}
						>
							Promote to PR
						</button>
					)}
					{chat.prStatus !== null && (
						<Badge
							label={chat.prStatus === "ready" ? "PR Ready" : "PR Draft"}
							variant={chat.prStatus === "ready" ? "ready" : "draft"}
						/>
					)}
					{chat.prStatus === "draft" && (
						<button
							type="button"
							className="px-3 py-1.5 rounded-full text-xs font-semibold bg-success-900/40 text-success-300 border border-success-600/30"
							onClick={() => {
								onMarkReady(chat.id);
							}}
						>
							Mark Ready
						</button>
					)}
					<IconButton label="View changes">
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
							<title>View changes</title>
							<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
						</svg>
					</IconButton>
					<IconButton label="Settings">
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
							<title>Settings</title>
							<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
						</svg>
					</IconButton>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
				{chat.messages.map((message: IMessage) => (
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
											// Make links clickable and styled
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
											// Style code blocks
											code: ({ children, className }) => {
												const isInline =
													className === undefined || className === "";
												return isInline ? (
													<code className="bg-secondary px-1.5 py-0.5 rounded text-xs">
														{children}
													</code>
												) : (
													<code className={className}>{children}</code>
												);
											},
											// Style horizontal rules (tool activity separator)
											hr: () => <hr className="border-border my-3" />,
										}}
									>
										{message.content}
									</Markdown>
								</div>
							)}
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<form
				onSubmit={handleSubmit}
				className="border-t border-border bg-bg-subtle px-4 py-3"
			>
				<div className="flex items-center gap-3 bg-secondary border border-border rounded-full px-4 py-2">
					{/* Model selector */}
					<ModelSelector
						selectedModel={selectedModel}
						onModelChange={setSelectedModel}
						disabled={false}
					/>

					{/* Divider */}
					<div className="w-px h-5 bg-border shrink-0" />

					<input
						type="text"
						value={input}
						onChange={(event) => {
							setInput(event.target.value);
						}}
						placeholder="Describe what you want to build or fix..."
						className="flex-1 bg-transparent text-fg placeholder-fg-subtle focus:outline-none text-sm"
					/>
					<button
						type="submit"
						disabled={input.trim() === ""}
						className="h-9 w-9 rounded-full bg-fg text-bg flex items-center justify-center disabled:opacity-30"
					>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
							<title>Send</title>
							<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
						</svg>
					</button>
				</div>
				<p className="text-[11px] text-fg-subtle mt-2 text-center">
					Press Enter to send • AI will edit code and run contracts
				</p>
			</form>
		</div>
	);
}
