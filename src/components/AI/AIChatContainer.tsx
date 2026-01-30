import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import BuilderModeSelector from "@/components/AI/BuilderModeSelector.tsx";
import {
	EmptyState,
	FeatureCard,
	InfoBanner,
} from "@/components/AI/chat/index.ts";
import SchemaPreview from "@/components/AI/chat/SchemaPreview.tsx";
import InfraPanel from "@/components/AI/InfraPanel.tsx";
import type { TabType } from "@/components/AI/TabBar.tsx";
import type { IStructure } from "@/components/FileViewer.tsx";
import FileViewer from "@/components/FileViewer.tsx";
import SchemaBuilder from "@/components/SchemaBuilder.tsx";
import { Banner } from "@/components/UI/Banner.tsx";
import { CREATION_MODES } from "@/constants.ts";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useRemoteRepoFiles } from "@/hooks/useRemoteRepoFiles.ts";
import { useUser } from "@/hooks/useUser.ts";
import type {
	IIntrospectedSchemaInfo,
	ISchemaInfo,
} from "@/interfaces/interfaces.ts";
import { useVercelChat } from "@/lib/chat/index.ts";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useProjectStore } from "@/useProjectStore.ts";
import { useTransformationsStore } from "@/useTransformationsStore.ts";
import convertIntrospectedStructure from "@/utils/convertIntrospectedStructure.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import type { IFailedFormatEntry } from "@/utils/project-builder/buildProjectFiles.ts";
import { getRandomIntro } from "@/utils/randomIntro.ts";
import {
	removeHiddenSchemaFromText,
	validateSchemaInfoFromResponse,
} from "@/utils/schemaInfoValidator.ts";

// Model configuration types
export type ModelId =
	| "gpt-5-nano"
	| "gpt-5-mini"
	| "gpt-5.2-codex"
	| "claude-sonnet-4.5"
	| "claude-opus-4.5";

export interface IModelOption {
	id: ModelId;
	name: string;
	provider: "openai" | "anthropic";
}

export const MODEL_OPTIONS: IModelOption[] = [
	{ id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai" },
	{ id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
	{ id: "gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "openai" },
	{ id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic" },
	{ id: "claude-opus-4.5", name: "Claude Opus 4.5", provider: "anthropic" },
];

interface IChatMessageProps {
	message: UIMessage;
}

function ChatMessage({ message }: IChatMessageProps) {
	const isUser = message.role === "user";

	// For assistant messages, check if there's a valid schema embedded
	const { displayText, schema } = useMemo(() => {
		if (isUser) {
			return { displayText: null, schema: null };
		}

		// Get full text from message parts
		const fullText = message.parts
			.filter(
				(part): part is { type: "text"; text: string } => part.type === "text",
			)
			.map((part) => part.text)
			.join("\n");

		// Try to extract and validate schema
		const result = validateSchemaInfoFromResponse(fullText);

		if (result.success && result.extracted && result.data !== undefined) {
			// Remove hidden schema comment from display text
			const cleanText = removeHiddenSchemaFromText(fullText);
			return { displayText: cleanText, schema: result.data };
		}

		return { displayText: null, schema: null };
	}, [isUser, message.parts]);

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={
					isUser
						? "max-w-3xl px-6 py-4 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-primary-600 to-primary-700 text-fg shadow-lg shadow-primary-900/20"
						: "max-w-3xl px-2 py-2 text-fg"
				}
			>
				<div className="prose prose-invert max-w-none">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							// Use cleaned text if we extracted a schema, otherwise use original
							const textToRender = displayText ?? part.text;

							return (
								<Markdown
									key={`text-${message.id}-${String(index)}`}
									components={{
										code(props) {
											const { children, className, ...rest } = props;
											const match = /language-(\w+)/.exec(className ?? "");
											return match !== null ? (
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
													{/* eslint-disable-next-line @typescript-eslint/no-base-to-string */}
													{String(children).replace(/\n$/, "")}
												</SyntaxHighlighter>
											) : (
												<code
													ref={rest.ref}
													style={rest.style}
													className={className}
												>
													{children}
												</code>
											);
										},
									}}
								>
									{textToRender}
								</Markdown>
							);
						}
						// Hide reasoning parts
						return null;
					})}

					{/* Render schema preview if found */}
					{schema !== null && <SchemaPreview schema={schema} />}
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
	const [randomIntro] = useState(() => getRandomIntro());

	useEffect(() => {
		// Only auto-scroll when there are messages
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	return (
		<div
			className={`flex-1 overflow-x-hidden scrollbar-thin ${messages.length > 0 ? "overflow-y-auto" : "overflow-y-hidden"}`}
		>
			<div className="max-w-5xl mx-auto px-3 pt-6 pb-3 md:px-6 md:pt-8 md:pb-6 space-y-4 md:space-y-6 h-full">
				{messages.length === 0 && (
					<EmptyState title="I am Judas" description={randomIntro}>
						<div className="grid grid-cols-2 gap-4 md:gap-5">
							<FeatureCard
								title="E-commerce Platform"
								description="Build an online store with products, cart, and checkout"
								variant="primary"
								icon={
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
								}
							/>
							<FeatureCard
								title="Social Network"
								description="Create a platform with posts, comments, and user profiles"
								variant="info"
								icon={
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
								}
							/>
							<FeatureCard
								title="Task Management"
								description="Manage projects, tasks, and team collaboration"
								variant="success"
								icon={
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
								}
							/>
							<FeatureCard
								title="Content Platform"
								description="Build a blog, news site, or content management system"
								variant="warning"
								icon={
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
								}
							/>
						</div>

						<InfoBanner title="Pro tip:" inline className="w-fit mx-auto">
							List roles, key features, and any special rules.
						</InfoBanner>
					</EmptyState>
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

// Custom model selector dropdown component
interface IModelSelectorProps {
	selectedModel: ModelId;
	onModelChange: (model: ModelId) => void;
	disabled: boolean;
}

export function ModelSelector({
	selectedModel,
	onModelChange,
	disabled,
}: IModelSelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const currentModel = MODEL_OPTIONS.find((m) => m.id === selectedModel);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current !== null &&
				// eslint-disable-next-line no-type-assertion/no-type-assertion
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Close on escape key
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	const openaiModels = MODEL_OPTIONS.filter((m) => m.provider === "openai");
	const anthropicModels = MODEL_OPTIONS.filter(
		(m) => m.provider === "anthropic",
	);

	const handleSelect = (modelId: ModelId) => {
		onModelChange(modelId);
		setIsOpen(false);
	};

	return (
		<div ref={dropdownRef} className="relative shrink-0">
			{/* Trigger button */}
			<button
				type="button"
				onClick={() => {
					if (!disabled) {
						setIsOpen(!isOpen);
					}
				}}
				disabled={disabled}
				className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span>{currentModel?.name ?? "Select model"}</span>
				<svg
					className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Toggle dropdown</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{/* Dropdown menu */}
			{isOpen && (
				<div className="absolute left-0 bottom-full mb-2 w-44 bg-secondary border border-border rounded-lg shadow-lg overflow-hidden z-50">
					{/* OpenAI group */}
					<div className="px-3 py-1.5 text-xs text-fg-subtle font-medium border-b border-border">
						OpenAI
					</div>
					{openaiModels.map((model) => (
						<button
							key={model.id}
							type="button"
							onClick={() => {
								handleSelect(model.id);
							}}
							className={`w-full px-3 py-2 text-sm text-left hover:bg-bg transition-colors ${
								selectedModel === model.id
									? "text-primary-400 bg-bg"
									: "text-fg"
							}`}
						>
							{model.name}
						</button>
					))}

					{/* Anthropic group */}
					<div className="px-3 py-1.5 text-xs text-fg-subtle font-medium border-y border-border">
						Anthropic
					</div>
					{anthropicModels.map((model) => (
						<button
							key={model.id}
							type="button"
							onClick={() => {
								handleSelect(model.id);
							}}
							className={`w-full px-3 py-2 text-sm text-left hover:bg-bg transition-colors ${
								selectedModel === model.id
									? "text-primary-400 bg-bg"
									: "text-fg"
							}`}
						>
							{model.name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

interface IChatInputProps {
	input: string;
	onChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	selectedModel: ModelId;
	onModelChange: (model: ModelId) => void;
}

function ChatInput({
	input,
	onChange,
	onSubmit,
	isLoading,
	selectedModel,
	onModelChange,
}: IChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea !== null) {
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
			if (input.trim() !== "" && !isLoading) {
				onSubmit(e);
			}
		}
	};

	return (
		<div className="border-t border-border bg-bg p-3 md:p-4">
			<form onSubmit={onSubmit} className="max-w-5xl mx-auto">
				{/* ChatGPT-style composer - single row layout */}
				<div className="flex items-center gap-3 bg-secondary border border-border rounded-full px-4 py-2">
					{/* Model selector (left) */}
					<ModelSelector
						selectedModel={selectedModel}
						onModelChange={onModelChange}
						disabled={isLoading}
					/>

					{/* Divider */}
					<div className="w-px h-5 bg-border shrink-0 self-center" />

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
						className="flex-1 bg-transparent text-fg resize-none focus:outline-none disabled:opacity-50 placeholder-fg-subtle text-sm leading-normal min-h-[24px] self-center"
						style={{ overflow: "hidden" }}
					/>

					{/* Send button (right) */}
					<button
						type="submit"
						disabled={isLoading || input.trim() === ""}
						className="p-1.5 bg-fg text-bg rounded-full hover:bg-fg-muted focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 self-center"
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
	error: { message: string };
	onRetry: () => void;
}

function ChatError({ error, onRetry }: IChatErrorProps) {
	// Parse error message for user-friendly display
	const getErrorInfo = (err: { message: string }) => {
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
			description: message !== "" ? message : "Please try again.",
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

interface IBuilderPanelProps {
	messages: UIMessage[];
	isLoading: boolean;
	error: { message: string } | null;
	onRetry: () => void;
	input: string;
	onInputChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	selectedModel: ModelId;
	onModelChange: (model: ModelId) => void;
}

/**
 * Builder panel that shows the mode selector at top and switches content
 * based on the selected creation mode (Judas AI, Schema Builder, Introspector).
 */
function BuilderPanel({
	messages,
	isLoading,
	error,
	onRetry,
	input,
	onInputChange,
	onSubmit,
	selectedModel,
	onModelChange,
}: IBuilderPanelProps) {
	const { creationMode } = useFormStore();

	return (
		<div className="flex flex-col flex-1 min-w-0 bg-bg">
			{/* Mode selector at top */}
			<BuilderModeSelector />

			{/* Content based on mode */}
			{creationMode === CREATION_MODES.JUDAS && (
				<>
					<ChatMessages messages={messages} isLoading={isLoading} />
					{error !== null && <ChatError error={error} onRetry={onRetry} />}
					<ChatInput
						input={input}
						onChange={onInputChange}
						onSubmit={onSubmit}
						isLoading={isLoading}
						selectedModel={selectedModel}
						onModelChange={onModelChange}
					/>
				</>
			)}

			{creationMode === CREATION_MODES.SCHEMA_BUILDER && (
				<div className="flex-1 overflow-auto p-4">
					<SchemaBuilder />
				</div>
			)}

			{creationMode === CREATION_MODES.INTROSPECTOR && <IntrospectorPanel />}
		</div>
	);
}

/**
 * Introspector panel for connecting to an existing database and generating schema.
 * Mobile-first design using design system tokens.
 */
function IntrospectorPanel() {
	const { dbConnection, setDbConnection, dbType, setDBType } = useFormStore();
	const { setSchemaInfo } = useTransformationsStore();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleIntrospect = async () => {
		if (dbConnection.trim() === "") {
			setError("Please enter a database connection string");
			return;
		}

		setIsLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await fetch(`${getApiUrl()}/introspect`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ dbConnection, dbType }),
			});

			if (!response.ok) {
				// eslint-disable-next-line no-type-assertion/no-type-assertion
				const errorData = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(errorData.error ?? "Failed to introspect database");
			}

			 
			const introspectedSchemaInfo =
				(await response.json()) as IIntrospectedSchemaInfo[];
			const convertedSchemaInfo = convertIntrospectedStructure(
				introspectedSchemaInfo,
			);

			setSchemaInfo(convertedSchemaInfo);
			setSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-detect database type from connection string
	const handleConnectionChange = (value: string) => {
		setDbConnection(value);
		setError(null);
		setSuccess(false);

		// Auto-detect DB type from connection string
		if (value.startsWith("postgresql://") || value.startsWith("postgres://")) {
			setDBType("postgresql");
		} else if (value.startsWith("mysql://")) {
			setDBType("mysql");
		}
	};

	return (
		<div className="flex-1 overflow-auto">
			<div className="max-w-lg mx-auto px-4 py-6 md:py-10">
				{/* Header */}
				<header className="text-center mb-6 md:mb-8">
					<h2 className="text-lg md:text-xl font-semibold text-fg mb-1">
						Database Introspector
					</h2>
					<p className="text-sm text-fg-muted">
						Connect to an existing database to generate code
					</p>
				</header>

				{/* Form */}
				<div className="space-y-4 md:space-y-5">
					{/* Connection String Input */}
					<div className="form-group">
						<label htmlFor="dbConnectionInput" className="form-label">
							Connection String
						</label>
						<input
							id="dbConnectionInput"
							type="text"
							value={dbConnection}
							onChange={(e) => {
								handleConnectionChange(e.target.value);
							}}
							placeholder="postgresql://user:pass@localhost:5432/db"
							className={`form-input form-input-lg form-input-rounded ${error !== null ? "form-input-error" : ""}`}
						/>
						<p className="text-xs text-fg-subtle mt-1">
							PostgreSQL or MySQL connection string
						</p>
					</div>

					{/* Database Type Selector */}
					<div className="form-group">
						<span className="form-label">Database Type</span>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => {
									setDBType("postgresql");
								}}
								className={`btn-secondary btn-rounded flex-1 ${
									dbType === "postgresql"
										? "!bg-accent !text-accent-fg !border-accent"
										: ""
								}`}
							>
								PostgreSQL
							</button>
							<button
								type="button"
								onClick={() => {
									setDBType("mysql");
								}}
								className={`btn-secondary btn-rounded flex-1 ${
									dbType === "mysql"
										? "!bg-accent !text-accent-fg !border-accent"
										: ""
								}`}
							>
								MySQL
							</button>
						</div>
					</div>

					{/* Error Message */}
					{error !== null && (
						<Banner variant="danger" inline>
							{error}
						</Banner>
					)}

					{/* Success Message */}
					{success && (
						<Banner variant="success" inline>
							Schema introspected! View generated code in the Code tab.
						</Banner>
					)}

					{/* Introspect Button */}
					<button
						type="button"
						onClick={() => void handleIntrospect()}
						disabled={isLoading || dbConnection.trim() === ""}
						className="btn-primary btn-full btn-lg btn-rounded btn-icon"
					>
						{isLoading ? (
							<>
								<svg
									className="animate-spin w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
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
								<span>Introspecting...</span>
							</>
						) : (
							"Introspect Database"
						)}
					</button>

					{/* Help Text */}
					<p className="text-xs text-fg-subtle text-center">
						Ensure the database is accessible from the server
					</p>
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

		if (result.success && result.extracted && result.data !== undefined) {
			return result.data;
		}
	}

	return null;
}

interface IAIChatContainerProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
	/** If true, renders Judas AI chat. If false, renders the multi-chat panel (passed as children) */
	isScaffolderRepo?: boolean;
	/** Custom chat panel to render when not in scaffolder mode */
	children?: React.ReactNode;
	/** Repository URL for fetching files in repository mode */
	repoUrl?: string;
	/** Repository name for display */
	repoName?: string;
	/** Whether to use local scaffolder files (dev mode toggle) */
	useLocalScaffolderFiles?: boolean;
	/** Callback to toggle local scaffolder files */
	onToggleLocalScaffolderFiles?: (value: boolean) => void;
	/** Remote scaffolder files URL */
	remoteScaffolderURL?: string;
	/** Callback to set remote scaffolder URL */
	onRemoteScaffolderURLChange?: (url: string) => void;
}

export function AIChatContainer({
	activeTab,
	onTabChange: _onTabChange,
	isScaffolderRepo = true,
	children,
	repoUrl,
	repoName,
	useLocalScaffolderFiles = true,
	onToggleLocalScaffolderFiles,
	remoteScaffolderURL = "",
	onRemoteScaffolderURLChange,
}: IAIChatContainerProps) {
	const [input, setInput] = useState("");
	const [selectedModel, setSelectedModel] = useState<ModelId>("gpt-5-nano");

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
	const { user, accessToken } = useUser();

	// Fetch repository files for non-scaffolder mode (lazy load - only when Code tab is active)
	// Tries local clone first (if available), then falls back to remote GitHub API
	const { data: repoFiles, isLoading: isRepoFilesLoading } = useRemoteRepoFiles(
		{ repoUrl: repoUrl ?? "", authToken: accessToken ?? undefined },
		{
			enabled:
				activeTab === "fileViewer" &&
				!isScaffolderRepo &&
				repoUrl !== undefined &&
				repoUrl !== "",
		},
	);

	// Local state for build results
	const [buildResult, setBuildResult] = useState<{
		structure: IStructure;
		filesUsingUserEnv: string[];
		filesFailedToFormat: IFailedFormatEntry[];
	}>({ structure: [], filesUsingUserEnv: [], filesFailedToFormat: [] });

	// Use the chat abstraction with Vercel AI SDK features
	const chat = useVercelChat({
		endpoint: "/api/chat",
		model: selectedModel,
	});

	const { messages, sendMessage, error, retry: reload } = chat;
	const isLoading = chat.isLoading;

	// Set default project when projects load (scaffolder mode only)
	// Set default project when projects load (scaffolder mode only)
	useEffect(() => {
		// Auto-select first project if none selected (scaffolder mode only)
		if (isScaffolderRepo && projects.length > 0 && selectedProject === null) {
			const firstProject = projects[0];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (firstProject !== undefined) {
				selectProject(firstProject);
			}
		}
	}, [projects, selectedProject, selectProject, isScaffolderRepo]);

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

	const handleProjectChange = (projectName: string) => {
		const project = projects.find((p) => p.name === projectName);
		if (project !== undefined) {
			selectProject(project);
		}
	};

	const builtProjectFiles = buildResult.structure;
	const filesUsingUserEnv = buildResult.filesUsingUserEnv;
	const filesFailedToFormat = buildResult.filesFailedToFormat;

	// For repository mode, show files if loaded
	const hasRepoFiles: boolean =
		!isScaffolderRepo && repoFiles !== undefined && repoFiles.length > 0;

	return (
		<div className="flex h-full w-full bg-bg overflow-hidden">
			{/* FileViewer panel - Scaffolder mode (always render when on fileViewer tab) */}
			{isScaffolderRepo && activeTab === "fileViewer" && (
				<div className="flex flex-col overflow-hidden w-full">
					<FileViewer
						mode="edit"
						folderStructure={builtProjectFiles}
						projectName={selectedProject?.name ?? "Select a project"}
						filesUsingUserEnv={filesUsingUserEnv}
						filesFailedToFormat={filesFailedToFormat}
						projects={projects}
						selectedProject={selectedProject ?? undefined}
						onProjectChange={handleProjectChange}
						useLocalScaffolderFiles={useLocalScaffolderFiles}
						onToggleLocalScaffolderFiles={onToggleLocalScaffolderFiles}
						remoteScaffolderURL={remoteScaffolderURL}
						onRemoteScaffolderURLChange={onRemoteScaffolderURLChange}
					/>
				</div>
			)}

			{/* FileViewer panel - Repository mode (view) */}
			{!isScaffolderRepo && activeTab === "fileViewer" && (
				<div className="flex flex-col overflow-hidden w-full">
					{isRepoFilesLoading && (
						<div className="flex-1 flex items-center justify-center">
							<div className="text-center space-y-3">
								<div className="w-12 h-12 mx-auto border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
								<p className="text-sm text-fg-muted">
									Loading repository files...
								</p>
							</div>
						</div>
					)}
					{!isRepoFilesLoading && hasRepoFiles && repoFiles !== undefined && (
						<FileViewer
							mode="view"
							folderStructure={repoFiles}
							projectName={repoName ?? "Repository"}
						/>
					)}
					{!isRepoFilesLoading && !hasRepoFiles && (
						<div className="flex-1 flex items-center justify-center">
							<div className="text-center space-y-3 max-w-md px-4">
								<div className="w-16 h-16 mx-auto rounded-2xl bg-secondary border border-border flex items-center justify-center text-fg-subtle">
									<svg
										className="w-8 h-8"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>No files</title>
										<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
									</svg>
								</div>
								<h3 className="text-lg font-semibold text-fg">
									No files found
								</h3>
								<p className="text-sm text-fg-subtle">
									Unable to load files from this repository. Make sure the
									repository is public and contains files.
								</p>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Builder panel - Show only when chat tab is active in scaffolder mode */}
			{activeTab === "chat" && isScaffolderRepo && (
				<BuilderPanel
					messages={messages}
					isLoading={isLoading}
					error={error}
					onRetry={reload}
					input={input}
					onInputChange={setInput}
					onSubmit={handleSubmit}
					selectedModel={selectedModel}
					onModelChange={setSelectedModel}
				/>
			)}

			{/* Multi-chat panel - Show when chat tab is active and NOT scaffolder repo */}
			{activeTab === "chat" && !isScaffolderRepo && children}

			{/* Infra panel - Show only when infra tab is active */}
			{activeTab === "infra" && (
				<div className="flex flex-col flex-1 w-full min-w-0 bg-bg">
					<InfraPanel />
				</div>
			)}
		</div>
	);
}
