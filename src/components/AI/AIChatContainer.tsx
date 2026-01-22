import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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

interface ChatMessageProps {
	message: UIMessage;
}

function ChatMessage({ message }: ChatMessageProps) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-3xl px-6 py-4 rounded-2xl backdrop-blur-sm ${
					isUser
						? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/20"
						: "bg-gray-800/50 border border-gray-700 text-white"
				}`}
			>
				{message.parts.map((part, index) => {
					if (part.type === "text") {
						// Remove hidden schemaInfo from display
						const displayText = removeHiddenSchemaFromText(part.text);
						if (!displayText) return null;

						return (
							<div
								key={`${message.id}-${index}`}
								className="text-sm prose prose-invert prose-sm max-w-none"
							>
								<Markdown
									components={{
										code({ className, children, ...props }) {
											const match = /language-(\w+)/.exec(className ?? "");
											const codeString = String(children).replace(/\n$/, "");

											// Check if it's an inline code or block code
											const isInline = !className && !codeString.includes("\n");

											if (isInline) {
												return (
													<code
														className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 text-xs"
														{...props}
													>
														{children}
													</code>
												);
											}

											return (
												<SyntaxHighlighter
													style={oneDark}
													language={match?.[1] ?? "json"}
													PreTag="div"
													className="rounded-md text-xs !my-2"
													customStyle={{ fontSize: "0.75rem" }}
												>
													{codeString}
												</SyntaxHighlighter>
											);
										},
										p({ children }) {
											return <p className="mb-2 last:mb-0">{children}</p>;
										},
										ul({ children }) {
											return (
												<ul className="list-disc pl-4 mb-2 space-y-1">
													{children}
												</ul>
											);
										},
										ol({ children }) {
											return (
												<ol className="list-decimal pl-4 mb-2 space-y-1">
													{children}
												</ol>
											);
										},
										li({ children }) {
											return <li className="text-sm">{children}</li>;
										},
										strong({ children }) {
											return (
												<strong className="font-semibold text-white">
													{children}
												</strong>
											);
										},
										h1({ children }) {
											return (
												<h1 className="text-lg font-bold mb-2 mt-3">
													{children}
												</h1>
											);
										},
										h2({ children }) {
											return (
												<h2 className="text-base font-bold mb-2 mt-3">
													{children}
												</h2>
											);
										},
										h3({ children }) {
											return (
												<h3 className="text-sm font-bold mb-1 mt-2">
													{children}
												</h3>
											);
										},
									}}
								>
									{displayText}
								</Markdown>
							</div>
						);
					}
					if (part.type === "reasoning") {
						return (
							<details key={`${message.id}-${index}`} className="mt-2">
								<summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
									View reasoning
								</summary>
								<pre className="mt-1 p-2 bg-gray-800 rounded text-xs overflow-x-auto">
									{part.text}
								</pre>
							</details>
						);
					}
					return null;
				})}
			</div>
		</div>
	);
}

interface ChatMessagesProps {
	messages: UIMessage[];
	isLoading: boolean;
}

function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
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
								<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>AI Assistant</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
										/>
									</svg>
								</div>
								<h2 className="text-3xl font-bold text-white">
									Build Your Application with Judas
								</h2>
								<p className="text-base text-gray-300 leading-relaxed">
									Describe your application idea in plain English. I'll design
									the database schema, generate the code structure, and create a
									production-ready foundation for your project.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-blue-400"
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
											<h3 className="text-sm font-semibold text-white mb-1">
												E-commerce Platform
											</h3>
											<p className="text-xs text-gray-400">
												Build an online store with products, cart, and checkout
											</p>
										</div>
									</div>
								</div>

								<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-purple-400"
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
											<h3 className="text-sm font-semibold text-white mb-1">
												Social Network
											</h3>
											<p className="text-xs text-gray-400">
												Create a platform with posts, comments, and user
												profiles
											</p>
										</div>
									</div>
								</div>

								<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-green-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-green-400"
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
											<h3 className="text-sm font-semibold text-white mb-1">
												Task Management
											</h3>
											<p className="text-xs text-gray-400">
												Manage projects, tasks, and team collaboration
											</p>
										</div>
									</div>
								</div>

								<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-orange-500/50 transition-all duration-200 cursor-pointer group">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
											<svg
												className="w-5 h-5 text-orange-400"
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
											<h3 className="text-sm font-semibold text-white mb-1">
												Content Platform
											</h3>
											<p className="text-xs text-gray-400">
												Build a blog, news site, or content management system
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
								<div className="flex items-start gap-3">
									<svg
										className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
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
									<div className="text-xs text-gray-300 leading-relaxed">
										<strong className="text-white">Pro Tip:</strong> Be specific
										about your requirements. Mention key features, user roles,
										and any special functionality you need. The more detail you
										provide, the better I can design your database schema.
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
				{messages.map((message) => (
					<ChatMessage key={message.id} message={message} />
				))}
				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 px-6 py-4 rounded-2xl">
							<div className="flex items-center gap-3">
								<div className="flex space-x-2">
									<div
										className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
										style={{ animationDelay: "0ms" }}
									/>
									<div
										className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
										style={{ animationDelay: "150ms" }}
									/>
									<div
										className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
										style={{ animationDelay: "300ms" }}
									/>
								</div>
								<span className="text-sm text-gray-300">Thinking...</span>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
}

interface ChatInputProps {
	input: string;
	onChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
}

function ChatInput({ input, onChange, onSubmit, isLoading }: ChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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
		<div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6">
			<form onSubmit={onSubmit} className="flex gap-3 max-w-5xl mx-auto">
				<div className="flex-1 relative">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => {
							onChange(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						placeholder="Describe your application idea in detail... (Shift+Enter for new line)"
						disabled={isLoading}
						rows={1}
						className="w-full px-5 py-4 bg-gray-800 text-white border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none min-h-[56px] max-h-[200px] placeholder-gray-500"
					/>
				</div>
				<button
					type="submit"
					disabled={isLoading || !input.trim()}
					className="px-6 py-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg shadow-blue-900/20 flex items-center gap-2"
				>
					{isLoading ? (
						<>
							<svg
								className="animate-spin h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								aria-label="Loading"
							>
								<title>Loading</title>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>Generating...</span>
						</>
					) : (
						<>
							<span>Send</span>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="Send message"
							>
								<title>Send message</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								/>
							</svg>
						</>
					)}
				</button>
			</form>
		</div>
	);
}

interface ChatErrorProps {
	error: Error;
	onRetry: () => void;
}

function ChatError({ error, onRetry }: ChatErrorProps) {
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
			<div className="bg-gradient-to-r from-amber-900/20 to-red-900/20 backdrop-blur-sm border border-amber-700/50 rounded-xl p-5 shadow-lg">
				<div className="flex items-start gap-4">
					<div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
						<svg
							className="w-5 h-5 text-amber-400"
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
						<p className="text-base text-amber-200 font-semibold mb-1">
							{errorInfo.title}
						</p>
						<p className="text-sm text-amber-300/80">{errorInfo.description}</p>
					</div>
					{errorInfo.canRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="px-4 py-2 text-sm bg-amber-800/50 hover:bg-amber-700/50 text-amber-200 rounded-lg transition-all duration-200 font-medium border border-amber-700/50 hover:border-amber-600"
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
		if (message.role !== "assistant") continue;

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

export function AIChatContainer() {
	const [input, setInput] = useState("");
	const [isFileViewerMinimized, setIsFileViewerMinimized] = useState(false);

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
			stop();
			const lastUserMessage = [...messages]
				.reverse()
				.find((m) => m.role === "user");
			if (lastUserMessage?.parts[0]?.type === "text") {
				sendMessage({ text: lastUserMessage.parts[0].text });
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
			selectProject(appGeneratorProjects[0]);
		}
	}, [appGeneratorProjects, selectedProject, selectProject]);

	// Extract schema from messages when not loading (streaming complete)
	const extractedSchema = useMemo(() => {
		if (isLoading) return null;
		const schema = extractSchemaFromMessages(messages);
		if (schema !== null) {
			console.log("[AI Chat] Extracted schema from AI:", schema);
		}
		return schema;
	}, [messages, isLoading]);

	// Update global schemaInfo when AI generates a schema - EXACTLY like SchemaBuilder does!
	useEffect(() => {
		if (extractedSchema !== null) {
			console.log(
				"[AI Chat] Updating global schemaInfo with AI-generated schema",
			);
			setSchemaInfo(extractedSchema);
			// Auto-expand FileViewer when new schema is generated
			setIsFileViewerMinimized(false);
		}
	}, [extractedSchema, setSchemaInfo]);

	// Build project files using the GLOBAL schemaInfo - same logic as App.tsx lines 125-157
	useEffect(() => {
		const hasSelectedProject = selectedProject !== null;
		const hasUser = user !== null;
		const hasUserFiles = storeUserFiles.length > 0;
		const hasSchema = schemaInfo.length > 0;
		const canBuildProject =
			hasSelectedProject && hasUser && hasUserFiles && hasSchema;

		if (canBuildProject) {
			console.log(
				"[AI Chat] Building project with global schemaInfo:",
				schemaInfo,
			);
			void (async () => {
				const result = await buildProjectFilesForProject(
					selectedProject,
					schemaInfo, // Use GLOBAL schemaInfo, not extractedSchema
					decryptedMetadata ?? null,
				);
				setBuildResult(result);
			})();
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
		if (input.trim() && !isLoading) {
			sendMessage({ text: input });
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

	// Debug logging
	useEffect(() => {
		console.log("[AI Chat] FileViewer visibility check:", {
			schemaInfoLength: schemaInfo.length,
			builtProjectFilesLength: builtProjectFiles.length,
			selectedProject: selectedProject?.name ?? "null",
			shouldShowFileViewer,
		});
	}, [schemaInfo, builtProjectFiles, selectedProject, shouldShowFileViewer]);

	// Keyboard shortcut: Ctrl+B to toggle FileViewer (like VS Code)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				if (shouldShowFileViewer) {
					setIsFileViewerMinimized((prev) => !prev);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [shouldShowFileViewer]);

	return (
		<div className="flex h-full w-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 overflow-hidden">
			{/* FileViewer panel - Left side (like Cursor IDE) */}
			{shouldShowFileViewer && (
				<div
					className={`flex flex-col bg-gray-800/80 backdrop-blur-xl border-r border-gray-700/50 overflow-hidden transition-all duration-300 shadow-2xl ${
						isFileViewerMinimized ? "w-14" : "w-1/2"
					}`}
				>
					{isFileViewerMinimized ? (
						/* Minimized state - vertical tab */
						<button
							type="button"
							onClick={() => setIsFileViewerMinimized(false)}
							className="flex-1 flex flex-col items-center justify-center gap-4 py-6 hover:bg-gray-700/50 transition-all duration-200 group"
							title="Expand Code View"
						>
							<div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
								<svg
									className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Expand</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
							<span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">
								Code
							</span>
						</button>
					) : (
						/* Expanded state */
						<>
							<div className="flex items-center justify-between px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50">
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
										<h3 className="text-base font-semibold text-white">
											Generated Code
										</h3>
									</div>
									{appGeneratorProjects.length > 0 && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-gray-400">Template:</span>
											<select
												value={selectedProject.name}
												onChange={handleProjectChange}
												className="text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-700 transition-colors"
											>
												{appGeneratorProjects.map((project) => (
													<option key={project.name} value={project.name}>
														{project.name.replace("App Generator - ", "")}
													</option>
												))}
											</select>
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={() => setIsFileViewerMinimized(true)}
									className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
									title="Minimize"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Minimize</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</button>
							</div>
							<div className="flex-1 overflow-hidden">
								<FileViewer
									mode="edit"
									folderStructure={builtProjectFiles}
									projectName={selectedProject.name}
									filesUsingUserEnv={filesUsingUserEnv}
									filesFailedToFormat={filesFailedToFormat}
								/>
							</div>
						</>
					)}
				</div>
			)}

			{/* Chat panel - Right side (like Cursor IDE) */}
			<div className="flex flex-col flex-1 min-w-0 bg-gray-900/50 backdrop-blur-sm">
				<div className="border-b border-gray-800/50 px-6 py-4 bg-gray-900/30 backdrop-blur-sm">
					<div className="flex items-center gap-3 max-w-5xl mx-auto">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
							<svg
								className="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>AI Assistant</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
								/>
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">Judas</h2>
							<p className="text-xs text-gray-400">
								AI Code Generation Assistant
							</p>
						</div>
					</div>
				</div>
				<ChatMessages messages={messages} isLoading={isLoading} />
				{error && <ChatError error={error} onRetry={reload} />}
				<ChatInput
					input={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}
