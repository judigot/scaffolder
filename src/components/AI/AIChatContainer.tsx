import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { TabType } from "@/components/AI/TabBar.tsx";
import type { IStructure } from "@/components/FileViewer.tsx";
import FileViewer from "@/components/FileViewer.tsx";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useProjectStore } from "@/useProjectStore.ts";
import { useTransformationsStore } from "@/useTransformationsStore.ts";
import type { IFailedFormatEntry } from "@/utils/project-builder/buildProjectFiles.ts";
import {
	removeHiddenSchemaFromText,
	validateSchemaInfoFromResponse,
} from "@/utils/schemaInfoValidator.ts";

interface IChatMessageProps {
	message: UIMessage;
}

function ChatMessage({ message }: IChatMessageProps) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-3xl px-6 py-4 rounded-2xl backdrop-blur-sm ${
					isUser
						? "bg-gradient-to-br from-primary-600 to-primary-700 text-fg shadow-lg shadow-primary-900/20"
						: "bg-bg-muted/50 border border-border text-fg"
				}`}
			>
				<div
					className={`prose prose-invert max-w-none ${!isUser ? "italic font-bold" : ""}`}
				>
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
														fontSize: "0.875rem",
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
						// Hide reasoning parts
						return null;
					})}
				</div>
			</div>
		</div>
	);
}

interface IChatMessagesProps {
	messages: UIMessage[];
	isLoading: boolean;
}

function ChatMessages({ messages, isLoading }: IChatMessagesProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	return (
		<div
			className={`flex-1 overflow-x-hidden ${messages.length > 0 ? "overflow-y-auto" : "overflow-y-hidden"}`}
			style={{
				scrollbarWidth: "thin",
				scrollbarColor: "#374151 transparent",
			}}
		>
			<div className="max-w-5xl mx-auto px-6 py-6 space-y-6 h-full">
				{messages.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full">
						<div className="max-w-2xl w-full space-y-8">
							<div className="text-center space-y-4">
								<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mb-4">
									<svg
										className="w-8 h-8 text-fg"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Judas - App Magician</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
										/>
									</svg>
								</div>
								<h2 className="text-3xl font-bold text-fg">
									Build Your Application with Judas
								</h2>
								<p className="text-base text-fg-muted leading-relaxed">
									Describe your app idea and I'll make it happen like magic.
									Just tell me what you're dreaming of and I'll bring it to
									life!
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:border-primary-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-primary-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<title>E-commerce</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
												/>
											</svg>
										</div>
										<div>
											<h3 className="text-sm font-semibold text-fg mb-1">
												E-commerce Platform
											</h3>
											<p className="text-xs text-fg-muted">
												Build an online store with products, cart, and checkout
											</p>
										</div>
									</div>
								</div>

								<div className="bg-bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:border-info-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-info-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-info-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-info-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<title>Social Network</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
												/>
											</svg>
										</div>
										<div>
											<h3 className="text-sm font-semibold text-fg mb-1">
												Social Network
											</h3>
											<p className="text-xs text-fg-muted">
												Create a platform with posts, comments, and user
												profiles
											</p>
										</div>
									</div>
								</div>

								<div className="bg-bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:border-success-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-success-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-success-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<title>Task Manager</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
												/>
											</svg>
										</div>
										<div>
											<h3 className="text-sm font-semibold text-fg mb-1">
												Task Management
											</h3>
											<p className="text-xs text-fg-muted">
												Manage projects, tasks, and team collaboration
											</p>
										</div>
									</div>
								</div>

								<div className="bg-bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:border-warning-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-warning-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-warning-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<title>Content Platform</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
												/>
											</svg>
										</div>
										<div>
											<h3 className="text-sm font-semibold text-fg mb-1">
												Content Platform
											</h3>
											<p className="text-xs text-fg-muted">
												Build a blog, news site, or content management system
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="bg-gradient-to-r from-primary-500/10 to-primary-700/10 border border-primary-500/20 rounded-xl p-4">
								<div className="flex items-start gap-3">
									<svg
										className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Info</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<div className="text-xs text-fg-muted leading-relaxed">
										<strong className="text-fg">Pro Tip:</strong> Be specific
										about your requirements. Mention key features, user roles,
										and any special functionality you need. The more detail you
										provide, the better I can design your database schema.
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
				{messages.map((message, index) => {
					// Don't show the last assistant message while it's still loading/streaming
					const isLastMessage = index === messages.length - 1;
					const isAssistant = message.role === "assistant";
					if (isLastMessage && isAssistant && isLoading) {
						return null;
					}
					return <ChatMessage key={message.id} message={message} />;
				})}
				{isLoading && (
					<div className="flex justify-start pl-6">
						<img
							src="/magic.gif"
							alt="Weaving the enchantment..."
							className="w-24 h-24 object-contain"
						/>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
}

interface IChatInputProps {
	input: string;
	onChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
}

function ChatInput({ input, onChange, onSubmit, isLoading }: IChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			const maxHeight = 200;
			const newHeight = Math.min(textarea.scrollHeight, maxHeight);
			textarea.style.height = `${String(newHeight)}px`;
			textarea.style.overflowY =
				textarea.scrollHeight > maxHeight ? "auto" : "hidden";
		}
	}, []);

	useEffect(() => {
		adjustHeight();
	}, [input, adjustHeight]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				onSubmit(e);
			}
		}
	};

	return (
		<div className="border-t border-border bg-bg p-4">
			<form onSubmit={onSubmit} className="max-w-5xl mx-auto">
				{/* ChatGPT-style composer - single row layout */}
				<div className="flex items-end gap-2 bg-secondary border border-border rounded-full px-3 py-2">
					{/* Leading control (left) */}
					<button
						type="button"
						className="p-1.5 text-fg-muted hover:text-fg hover:bg-secondary-hover rounded-full transition-colors shrink-0"
						title="Add attachment"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Add attachment</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
					</button>

					{/* Textarea - grows to fill space */}
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => {
							onChange(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						placeholder="Describe your application idea..."
						disabled={isLoading}
						rows={1}
						className="flex-1 bg-transparent text-fg resize-none focus:outline-none disabled:opacity-50 placeholder-fg-subtle text-sm leading-relaxed py-1.5 min-h-[28px]"
						style={{ overflow: "hidden" }}
					/>

					{/* Trailing control (right) */}
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
								<title>Send message</title>
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
	);
}

interface IChatErrorProps {
	error: Error;
	onRetry: () => void;
}

function ChatError({ error, onRetry }: IChatErrorProps) {
	// Parse error message for user-friendly display
	const getErrorInfo = (err: Error) => {
		const message = err.message;

		if (message.includes("overloaded")) {
			return {
				title: "Service is busy",
				description:
					"The AI is handling a lot of requests right now. Please try again in a moment.",
				canRetry: true,
			};
		}

		if (message.includes("rate_limit") || message.includes("429")) {
			return {
				title: "Too many requests",
				description: "Please wait a moment before sending another message.",
				canRetry: true,
			};
		}

		if (message.includes("network") || message.includes("fetch")) {
			return {
				title: "Connection issue",
				description: "Please check your internet connection and try again.",
				canRetry: true,
			};
		}

		return {
			title: "Something went wrong",
			description: message || "Please try again.",
			canRetry: true,
		};
	};

	const errorInfo = getErrorInfo(error);

	return (
		<div className="mx-6 mb-6 max-w-5xl">
			<div className="bg-gradient-to-r from-warning-900/20 to-danger-900/20 backdrop-blur-sm border border-warning-700/50 rounded-xl p-5 shadow-lg">
				<div className="flex items-start gap-4">
					<div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center flex-shrink-0">
						<svg
							className="w-5 h-5 text-warning-400"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-label="Warning icon"
						>
							<title>Warning icon</title>
							<path
								fillRule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="text-base text-warning-200 font-semibold mb-1">
							{errorInfo.title}
						</p>
						<p className="text-sm text-warning-300/80">
							{errorInfo.description}
						</p>
					</div>
					{errorInfo.canRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="px-4 py-2 text-sm bg-warning-800/50 hover:bg-warning-700/50 text-warning-200 rounded-lg transition-all duration-200 font-medium border border-warning-700/50 hover:border-warning-600"
						>
							Try Again
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function extractSchemaFromMessages(
	messages: UIMessage[],
): ISchemaInfo[] | null {
	// Search messages from newest to oldest to find the latest valid schema
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message.role !== "assistant") {
			continue;
		}

		// Get full text content from message parts
		const fullText = message.parts
			.filter(
				(part): part is { type: "text"; text: string } => part.type === "text",
			)
			.map((part) => part.text)
			.join("\n");

		const result = validateSchemaInfoFromResponse(fullText);

		if (result.success && result.extracted && result.data) {
			return result.data;
		}
	}

	return null;
}

interface IAIChatContainerProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
}

export function AIChatContainer({
	activeTab,
	onTabChange,
}: IAIChatContainerProps) {
	const [input, setInput] = useState("");

	// Use the SAME store as SchemaBuilder.tsx - this is the key!
	const { schemaInfo, setSchemaInfo } = useTransformationsStore();

	// Get the same stores that App.tsx uses for building projects
	const {
		projects,
		selectedProject,
		selectProject,
		buildProjectFilesForProject,
	} = useProjectStore();
	const { userFiles: storeUserFiles } = useMockDatabaseStore();
	const { decryptedMetadata } = useDecryptedUserMetadata();
	const { user } = useUser();

	// Local state for build results
	const [buildResult, setBuildResult] = useState<{
		structure: IStructure;
		filesUsingUserEnv: string[];
		filesFailedToFormat: IFailedFormatEntry[];
	}>({ structure: [], filesUsingUserEnv: [], filesFailedToFormat: [] });

	const { messages, sendMessage, status, error, stop } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
	});

	const reload = () => {
		// Reload last message by stopping and resubmitting
		if (messages.length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
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

	const isLoading = status === "streaming" || status === "submitted";

	// Filter to only show "App Generator" projects
	const appGeneratorProjects = useMemo(() => {
		return projects.filter((p) => p.name.startsWith("App Generator"));
	}, [projects]);

	// Set default project when projects load
	useEffect(() => {
		if (appGeneratorProjects.length > 0 && selectedProject === null) {
			const firstProject = appGeneratorProjects[0];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (firstProject !== undefined) {
				selectProject(firstProject);
			}
		}
	}, [appGeneratorProjects, selectedProject, selectProject]);

	// Extract schema from messages when not loading (streaming complete)
	const extractedSchema = useMemo(() => {
		if (isLoading) {
			return null;
		}
		const schema = extractSchemaFromMessages(messages);
		return schema;
	}, [messages, isLoading]);

	// Update global schemaInfo when AI generates a schema - EXACTLY like SchemaBuilder does!
	useEffect(() => {
		if (extractedSchema !== null) {
			setSchemaInfo(extractedSchema);
			// Switch to fileViewer tab when new schema is generated
			onTabChange("fileViewer");
		}
	}, [extractedSchema, setSchemaInfo, onTabChange]);

	// Build project files using the GLOBAL schemaInfo - same logic as App.tsx lines 125-157
	useEffect(() => {
		const hasSelectedProject = selectedProject !== null;
		const hasUser = user !== null;
		const hasUserFiles = storeUserFiles.length > 0;
		const hasSchema = schemaInfo.length > 0;
		const canBuildProject =
			hasSelectedProject && hasUser && hasUserFiles && hasSchema;

		if (canBuildProject) {
			const buildProject = async () => {
				const result = await buildProjectFilesForProject(
					selectedProject,
					schemaInfo, // Use GLOBAL schemaInfo, not extractedSchema
					decryptedMetadata ?? null,
				);
				setBuildResult(result);
			};

			buildProject().catch((err: unknown) => {
				console.error("Failed to build project:", err);
			});
		} else {
			setBuildResult({
				structure: [],
				filesUsingUserEnv: [],
				filesFailedToFormat: [],
			});
		}
	}, [
		selectedProject,
		user,
		decryptedMetadata,
		buildProjectFilesForProject,
		schemaInfo, // Depend on GLOBAL schemaInfo
		storeUserFiles,
	]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim().length > 0 && !isLoading) {
			void sendMessage({ text: input });
			setInput("");
		}
	};

	const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const project = appGeneratorProjects.find((p) => p.name === e.target.value);
		if (project) {
			selectProject(project);
		}
	};

	const builtProjectFiles = buildResult.structure;
	const filesUsingUserEnv = buildResult.filesUsingUserEnv;
	const filesFailedToFormat = buildResult.filesFailedToFormat;

	// Check if we should show FileViewer
	const shouldShowFileViewer =
		schemaInfo.length > 0 &&
		builtProjectFiles.length > 0 &&
		selectedProject !== null;

	// We no longer need the Ctrl+B shortcut here as it's handled in the parent component
	// This effect has been removed since we're using the parent component for tab switching

	return (
		<div className="flex h-full w-full bg-bg overflow-hidden">
			{/* FileViewer panel - Show only when fileViewer tab is active */}
			{shouldShowFileViewer && activeTab === "fileViewer" && (
				<div className="flex flex-col overflow-hidden w-full">
					<FileViewer
						mode="edit"
						folderStructure={builtProjectFiles}
						projectName={selectedProject.name}
						filesUsingUserEnv={filesUsingUserEnv}
						filesFailedToFormat={filesFailedToFormat}
						projects={appGeneratorProjects}
						selectedProject={selectedProject}
						onProjectChange={handleProjectChange}
					/>
				</div>
			)}

			{/* Chat panel - Show only when chat tab is active */}
			{activeTab === "chat" && (
				<div className="flex flex-col flex-1 min-w-0 bg-bg">
					<ChatMessages messages={messages} isLoading={isLoading} />
					{error && <ChatError error={error} onRetry={reload} />}
					<ChatInput
						input={input}
						onChange={setInput}
						onSubmit={handleSubmit}
						isLoading={isLoading}
					/>
				</div>
			)}
		</div>
	);
}
