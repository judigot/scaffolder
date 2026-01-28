import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModelId } from "@/components/AI/AIChatContainer.tsx";
import { AIChatContainer } from "@/components/AI/AIChatContainer.tsx";
import ChatPanel from "@/components/AI/chat-app/ChatPanel.tsx";
import ChatTree from "@/components/AI/chat-app/ChatTree.tsx";
import { mockRepositories } from "@/components/AI/chat-app/mockData.ts";
import RepoTabs from "@/components/AI/chat-app/RepoTabs.tsx";
import TopNav, { type TopLevelTab } from "@/components/AI/chat-app/TopNav.tsx";
import type { IMessage, IRepository } from "@/components/AI/chat-app/types.ts";
import OpenCodeChatPanel from "@/components/AI/opencode/OpenCodeChatPanel.tsx";
import TabBar from "@/components/AI/TabBar.tsx";
import useDebouncedValue from "@/hooks/useDebouncedValue.ts";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import {
	type IStoredRepository,
	useRepositories,
} from "@/hooks/useRepositories.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserFiles } from "@/hooks/useUserFiles.ts";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useProjectStore } from "@/useProjectStore.ts";
import { useTransformationsStore } from "@/useTransformationsStore.ts";
import { useUIStore } from "@/useUIStore.ts";

/**
 * Convert stored repository (from Auth0) to full IRepository with local state
 */
function storedRepoToFullRepo(stored: IStoredRepository): IRepository {
	// Extract repo name from URL (e.g., "https://github.com/owner/repo" -> "repo")
	const match = /github\.com\/[\w.-]+\/([\w.-]+)/i.exec(stored.repoUrl);
	const repoName = match?.[1] ?? "repository";

	// Create a stable ID from the URL
	const repoId = `repo-${stored.repoUrl.replace(/[^a-zA-Z0-9]/g, "-")}`;

	return {
		id: repoId,
		name: repoName,
		path: `~/projects/${repoName}`,
		repoUrl: stored.repoUrl,
		sprints: [],
		chats: [],
	};
}

export default function ChatApp() {
	// ===== Top-level tab state =====
	const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>("scaffolder");
	const [repoMode, setRepoMode] = useState<"repo" | "opencode">("repo");

	// ===== Multi-repo chat state =====
	// Get persisted repos from Auth0
	const { repositories: storedRepos, addRepository: persistRepository } =
		useRepositories();

	// Convert stored repos to full IRepository objects with local state for sprints/chats
	// Always include mock data as demo reference, plus user's saved repos
	const persistedRepositories = useMemo(() => {
		const userRepos = storedRepos.map(storedRepoToFullRepo);
		// Mock data always first as demo reference
		return [...mockRepositories, ...userRepos];
	}, [storedRepos]);

	// Local state extends persisted repos with sprints/chats (not persisted to Auth0)
	const [localRepoState, setLocalRepoState] = useState<
		Map<
			string,
			{ sprints: IRepository["sprints"]; chats: IRepository["chats"] }
		>
	>(new Map());

	// Merge persisted repos with local state
	const repositories = useMemo(() => {
		return persistedRepositories.map((repo) => {
			const localState = localRepoState.get(repo.id);
			if (localState) {
				return {
					...repo,
					sprints: localState.sprints,
					chats: localState.chats,
				};
			}
			return repo;
		});
	}, [persistedRepositories, localRepoState]);

	// Wrapper to update local repo state - uses functional update pattern for correct state
	const setRepositories = useCallback(
		(updater: IRepository[] | ((prev: IRepository[]) => IRepository[])) => {
			setLocalRepoState((prevLocalState) => {
				// Reconstruct current repositories from persisted + local state
				const currentRepos = persistedRepositories.map((repo) => {
					const localState = prevLocalState.get(repo.id);
					if (localState) {
						return {
							...repo,
							sprints: localState.sprints,
							chats: localState.chats,
						};
					}
					return repo;
				});

				const newRepos =
					typeof updater === "function" ? updater(currentRepos) : updater;
				const newLocalState = new Map<
					string,
					{ sprints: IRepository["sprints"]; chats: IRepository["chats"] }
				>();
				for (const repo of newRepos) {
					newLocalState.set(repo.id, {
						sprints: repo.sprints,
						chats: repo.chats,
					});
				}
				return newLocalState;
			});
		},
		[persistedRepositories],
	);

	// Initialize with mock data (demo repo is always first)
	const [activeRepoId, setActiveRepoId] = useState<string>(
		mockRepositories[0]?.id ?? "",
	);
	const [activeSprintId, setActiveSprintId] = useState<string | null>(
		mockRepositories[0]?.sprints[0]?.id ?? null,
	);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const [activeChatScope, setActiveChatScope] = useState<"sprint" | "regular">(
		"regular",
	);

	// ===== Scaffolder state (from AI.tsx) =====
	const { activeTab, setActiveTab } = useUIStore();
	const formData = useFormStore();
	const {
		userMetadata,
		isLoading: isUserLoading,
		serverConfigStatus,
	} = useUser();
	const { decryptedMetadata } = useDecryptedUserMetadata();
	const { publicRepoURL, setPublicRepoURL } = formData;
	const { setTransformations, schemaInfo } = useTransformationsStore();
	const { typeMappings, dbTypes, setUserFiles } = useMockDatabaseStore();
	const { selectedProject, invalidateProjectCache } = useProjectStore();

	// Invalidate project cache when user metadata changes
	useEffect(() => {
		if (
			selectedProject !== null &&
			(userMetadata !== null || decryptedMetadata !== null)
		) {
			invalidateProjectCache(selectedProject.name);
		}
	}, [
		userMetadata,
		decryptedMetadata,
		selectedProject,
		invalidateProjectCache,
	]);

	const [inputRepoURL] = useState<string>(publicRepoURL);

	const { refetch: refetchUserFiles, data: userFiles } = useUserFiles(
		{ publicRepoURL },
		{
			refetchInterval: 5 * 60 * 1000,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			enabled: !!publicRepoURL,
		},
	);

	useEffect(() => {
		if (userFiles && userFiles.length > 0) {
			setUserFiles(userFiles);
		}
	}, [userFiles, setUserFiles]);

	const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);

	useEffect(() => {
		setPublicRepoURL(inputRepoURL);
		if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
			void refetchUserFiles();
		}
	}, [
		debouncedRepoURL,
		inputRepoURL,
		publicRepoURL,
		setPublicRepoURL,
		refetchUserFiles,
	]);

	useEffect(() => {
		if (!typeMappings || Object.keys(typeMappings).length === 0) {
			return;
		}
		if (!dbTypes || dbTypes.length === 0) {
			return;
		}
		setTransformations();
	}, [typeMappings, dbTypes, setTransformations]);

	useEffect(() => {
		if (publicRepoURL) {
			void refetchUserFiles();
		}
	}, [publicRepoURL, refetchUserFiles]);

	// Keyboard shortcut to toggle between tabs (Ctrl+B)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				const currentTab = useUIStore.getState().activeTab;
				const nextTab =
					currentTab === "fileViewer"
						? "chat"
						: currentTab === "chat"
							? "infra"
							: "fileViewer";
				setActiveTab(nextTab);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setActiveTab]);

	// ===== Multi-repo chat derived state =====
	const activeRepo = repositories.find((r) => r.id === activeRepoId);
	const activeSprint =
		activeRepo?.sprints.find((s) => s.id === activeSprintId) ?? null;
	const activeChat =
		activeChatScope === "regular"
			? (activeRepo?.chats.find((c) => c.id === activeChatId) ?? null)
			: (activeSprint?.chats.find((c) => c.id === activeChatId) ?? null);

	// ===== Multi-repo chat handlers =====
	const handleAddRepo = async (repoUrl: string) => {
		// Persist to Auth0 user_metadata
		const success = await persistRepository(repoUrl);
		if (!success) {
			// Could show error toast here
			console.error("Failed to persist repository to Auth0");
			return;
		}

		// Create the new repo object for local state
		const newRepo = storedRepoToFullRepo({
			repoUrl,
			addedAt: new Date().toISOString(),
		});

		// Update local state
		setLocalRepoState((prev) => {
			const newState = new Map(prev);
			newState.set(newRepo.id, { sprints: [], chats: [] });
			return newState;
		});

		setActiveRepoId(newRepo.id);
		setActiveSprintId(null);
		setActiveChatScope("regular");
		setActiveChatId(null);
	};

	const handleSelectRepo = (repoId: string) => {
		setActiveRepoId(repoId);
		const repo = repositories.find((r) => r.id === repoId);
		setActiveSprintId(repo?.sprints[0]?.id ?? null);
		setActiveChatScope("regular");
		setActiveChatId(null);
	};

	const handleSelectBranch = (
		repoId: string,
		chatId: string,
		scope: "sprint" | "regular",
		sprintId?: string,
	) => {
		setActiveRepoId(repoId);
		setActiveChatScope(scope);
		setActiveChatId(chatId);
		if (scope === "sprint") {
			setActiveSprintId(sprintId ?? null);
			return;
		}
		const repo = repositories.find((r) => r.id === repoId);
		setActiveSprintId(repo?.sprints[0]?.id ?? null);
	};

	const handleSelectSprint = (sprintId: string) => {
		setActiveSprintId(sprintId);
		const sprint = activeRepo?.sprints.find((s) => s.id === sprintId) ?? null;
		setActiveChatScope("sprint");
		setActiveChatId(sprint?.chats[0]?.id ?? null);
	};

	const handleSelectChat = (chatId: string) => {
		if (activeChatScope === "sprint" && activeChatId === chatId) {
			setActiveChatId(null);
			setActiveChatScope("regular");
			return;
		}
		setActiveChatScope("sprint");
		setActiveChatId(chatId);
	};

	const handleSelectRegularChat = (chatId: string) => {
		if (activeChatScope === "regular" && activeChatId === chatId) {
			setActiveChatId(null);
			return;
		}
		setActiveChatScope("regular");
		setActiveChatId(chatId);
	};

	const handleNewChat = () => {
		if (!activeRepo) {
			return;
		}

		const newChat = {
			id: `chat-${String(Date.now())}`,
			title: "New feature",
			description: "Describe your task...",
			prStatus: activeChatScope === "regular" ? null : ("draft" as const),
			messages: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		if (activeChatScope === "regular" || activeSprintId === null) {
			setRepositories((prev) =>
				prev.map((repo) =>
					repo.id === activeRepoId
						? { ...repo, chats: [newChat, ...repo.chats] }
						: repo,
				),
			);
			setActiveChatScope("regular");
			setActiveChatId(newChat.id);
			return;
		}

		setRepositories((prev) =>
			prev.map((repo) =>
				repo.id === activeRepoId
					? {
							...repo,
							sprints: repo.sprints.map((sprint) =>
								sprint.id === activeSprintId
									? {
											...sprint,
											chats: [newChat, ...sprint.chats],
											updatedAt: new Date(),
										}
									: sprint,
							),
						}
					: repo,
			),
		);
		setActiveChatId(newChat.id);
	};

	// Track ongoing streams to allow cancellation
	const abortControllerRef = useRef<AbortController | null>(null);
	const [isStreamingMessage, setIsStreamingMessage] = useState(false);

	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	// Helper to add a message to the current chat
	const addMessageToChat = useCallback(
		(chatId: string, message: IMessage) => {
			setRepositories((prev) =>
				prev.map((repo) =>
					repo.id === activeRepoId
						? {
								...repo,
								sprints: repo.sprints.map((sprint) =>
									sprint.id === activeSprintId
										? {
												...sprint,
												updatedAt: new Date(),
												chats: sprint.chats.map((chat) =>
													chat.id === chatId && activeChatScope === "sprint"
														? {
																...chat,
																messages: [...chat.messages, message],
																updatedAt: new Date(),
															}
														: chat,
												),
											}
										: sprint,
								),
								chats: repo.chats.map((chat) =>
									chat.id === chatId && activeChatScope === "regular"
										? {
												...chat,
												messages: [...chat.messages, message],
												updatedAt: new Date(),
											}
										: chat,
								),
							}
						: repo,
				),
			);
		},
		[activeRepoId, activeSprintId, activeChatScope, setRepositories],
	);

	// Helper to update the last assistant message (for streaming)
	const updateLastAssistantMessage = useCallback(
		(chatId: string, content: string) => {
			setRepositories((prev) =>
				prev.map((repo) =>
					repo.id === activeRepoId
						? {
								...repo,
								sprints: repo.sprints.map((sprint) =>
									sprint.id === activeSprintId
										? {
												...sprint,
												chats: sprint.chats.map((chat) => {
													if (
														chat.id !== chatId ||
														activeChatScope !== "sprint"
													) {
														return chat;
													}
													const messages = [...chat.messages];
													const lastMsg = messages[messages.length - 1];
													if (lastMsg?.role === "assistant") {
														messages[messages.length - 1] = {
															...lastMsg,
															content,
														};
													}
													return { ...chat, messages };
												}),
											}
										: sprint,
								),
								chats: repo.chats.map((chat) => {
									if (chat.id !== chatId || activeChatScope !== "regular") {
										return chat;
									}
									const messages = [...chat.messages];
									const lastMsg = messages[messages.length - 1];
									if (lastMsg?.role === "assistant") {
										messages[messages.length - 1] = { ...lastMsg, content };
									}
									return { ...chat, messages };
								}),
							}
						: repo,
				),
			);
		},
		[activeRepoId, activeSprintId, activeChatScope, setRepositories],
	);

	const handleSendMessage = async (
		chatId: string,
		content: string,
		model: ModelId,
	) => {
		// Add user message immediately
		const userMessage: IMessage = {
			id: `msg-${String(Date.now())}`,
			role: "user",
			content,
			timestamp: new Date(),
		};
		addMessageToChat(chatId, userMessage);

		// Get repo URL for the active repository
		const repoUrl = activeRepo?.repoUrl;
		if (!repoUrl) {
			const errorMessage: IMessage = {
				id: `msg-${String(Date.now() + 1)}`,
				role: "assistant",
				content: "Error: No repository URL configured for this repository.",
				timestamp: new Date(),
			};
			addMessageToChat(chatId, errorMessage);
			return;
		}

		// Get all messages for context (convert to API format)
		const currentChat =
			activeChatScope === "sprint"
				? activeRepo?.sprints
						.find((s) => s.id === activeSprintId)
						?.chats.find((c) => c.id === chatId)
				: activeRepo?.chats.find((c) => c.id === chatId);

		const allMessages = [...(currentChat?.messages ?? []), userMessage];
		const apiMessages = allMessages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));

		// Create placeholder for assistant response
		const assistantMessage: IMessage = {
			id: `msg-${String(Date.now() + 1)}`,
			role: "assistant",
			content: "",
			timestamp: new Date(),
		};
		addMessageToChat(chatId, assistantMessage);

		// Setup abort controller for cancellation
		abortControllerRef.current = new AbortController();
		setIsStreamingMessage(true);

		try {
			// Get access token if authenticated
			let headers: Record<string, string> = {
				"Content-Type": "application/json",
			};

			if (isAuthenticated) {
				try {
					const token = await getAccessTokenSilently();
					headers = { ...headers, Authorization: `Bearer ${token}` };
				} catch (authErr) {
					console.warn("[ChatApp] Could not get access token:", authErr);
				}
			}

			const response = await fetch("/api/repo-agent/chat", {
				method: "POST",
				headers,
				body: JSON.stringify({
					messages: apiMessages,
					repoUrl,
					model,
				}),
				signal: abortControllerRef.current.signal,
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ error: "Unknown error" }));
				const errorText =
					typeof errorData === "object" &&
					errorData !== null &&
					"error" in errorData
						? String(errorData.error)
						: "Request failed";
				updateLastAssistantMessage(chatId, `Error: ${errorText}`);
				setIsStreamingMessage(false);
				return;
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			if (!reader) {
				updateLastAssistantMessage(
					chatId,
					"Error: No response stream available",
				);
				setIsStreamingMessage(false);
				return;
			}

			const decoder = new TextDecoder();
			let fullContent = "";
			const toolActivities: string[] = [];
			let hadToolCallsSinceLastText = false;

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				const chunk = decoder.decode(value, { stream: true });

				// Parse SSE format from AI SDK
				// Format: "data: {json}"
				const lines = chunk.split("\n");
				for (const line of lines) {
					if (!line.startsWith("data: ")) {
						continue;
					}

					const jsonStr = line.slice(6); // Remove "data: " prefix
					if (jsonStr === "[DONE]") {
						continue;
					}

					try {
						const data = JSON.parse(jsonStr) as {
							type: string;
							delta?: string;
							toolName?: string;
							toolCallId?: string;
							input?: Record<string, unknown>;
							output?: {
								success?: boolean;
								output?: string;
								error?: string;
								url?: string;
							};
						};

						if (data.type === "text-start") {
							// New text block starting - if we had tool calls since last text, add a paragraph break
							if (hadToolCallsSinceLastText && fullContent.length > 0) {
								fullContent += "\n\n";
							}
							hadToolCallsSinceLastText = false;
						} else if (data.type === "text-delta" && data.delta) {
							// Text content streaming
							fullContent += data.delta;
							updateLastAssistantMessage(
								chatId,
								fullContent +
									(toolActivities.length > 0
										? "\n\n---\n" + toolActivities.join("\n")
										: ""),
							);
						} else if (data.type === "tool-input-available" && data.toolName) {
							// Tool call started
							hadToolCallsSinceLastText = true;
							const inputSummary = data.input
								? Object.entries(data.input)
										.map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`)
										.join(", ")
								: "";
							toolActivities.push(
								`⏳ ${data.toolName}(${inputSummary.slice(0, 80)}${inputSummary.length > 80 ? "..." : ""})`,
							);
							updateLastAssistantMessage(
								chatId,
								fullContent +
									(toolActivities.length > 0
										? "\n\n---\n" + toolActivities.join("\n")
										: ""),
							);
						} else if (data.type === "tool-output-available" && data.output) {
							// Tool result - update last tool activity
							const lastIdx = toolActivities.length - 1;
							if (lastIdx >= 0) {
								if (data.output.success) {
									toolActivities[lastIdx] = toolActivities[lastIdx].replace(
										"⏳",
										"✅",
									);
									if (data.output.url) {
										toolActivities[lastIdx] += ` → ${data.output.url}`;
									}
								} else {
									toolActivities[lastIdx] = toolActivities[lastIdx].replace(
										"⏳",
										"❌",
									);
									if (data.output.error) {
										toolActivities[lastIdx] +=
											` → ${data.output.error.slice(0, 100)}`;
									}
								}
							}
							updateLastAssistantMessage(
								chatId,
								fullContent +
									(toolActivities.length > 0
										? "\n\n---\n" + toolActivities.join("\n")
										: ""),
							);
						}
					} catch {
						// Not valid JSON, skip
					}
				}
			}

			// Ensure final content is set
			const finalContent =
				fullContent +
				(toolActivities.length > 0
					? "\n\n---\n" + toolActivities.join("\n")
					: "");
			if (finalContent.length > 0) {
				updateLastAssistantMessage(chatId, finalContent);
			} else if (toolActivities.length > 0) {
				// If we have tool activities but no text, show them
				updateLastAssistantMessage(
					chatId,
					"Tasks completed:\n" + toolActivities.join("\n"),
				);
			} else {
				updateLastAssistantMessage(chatId, "(No response generated)");
			}
		} catch (err: unknown) {
			if (err instanceof Error && err.name === "AbortError") {
				updateLastAssistantMessage(chatId, "(Request cancelled)");
			} else {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				updateLastAssistantMessage(chatId, `Error: ${errorMessage}`);
			}
		} finally {
			setIsStreamingMessage(false);
			abortControllerRef.current = null;
		}
	};

	// isStreamingMessage can be used to disable input while streaming
	void isStreamingMessage; // Mark as intentionally available for future use

	const handlePromoteChat = (chatId: string) => {
		setRepositories((prev) =>
			prev.map((repo) =>
				repo.id === activeRepoId
					? {
							...repo,
							chats: repo.chats.map((chat) =>
								chat.id === chatId
									? {
											...chat,
											prStatus: "draft" as const,
											updatedAt: new Date(),
										}
									: chat,
							),
						}
					: repo,
			),
		);
	};

	const handleMarkReady = (chatId: string) => {
		setRepositories((prev) =>
			prev.map((repo) =>
				repo.id === activeRepoId
					? {
							...repo,
							sprints: repo.sprints.map((sprint) =>
								sprint.id === activeSprintId
									? {
											...sprint,
											updatedAt: new Date(),
											chats: sprint.chats.map((chat) =>
												chat.id === chatId
													? {
															...chat,
															prStatus: "ready" as const,
															updatedAt: new Date(),
														}
													: chat,
											),
										}
									: sprint,
							),
							chats: repo.chats.map((chat) =>
								chat.id === chatId
									? {
											...chat,
											prStatus: "ready" as const,
											updatedAt: new Date(),
										}
									: chat,
							),
						}
					: repo,
			),
		);
	};

	// Multi-chat content panel (ChatTree + ChatPanel side by side)
	const multiChatContent = (
		<div className="flex flex-1 min-h-0 overflow-hidden">
			<ChatTree
				sprints={activeRepo?.sprints ?? []}
				regularChats={activeRepo?.chats ?? []}
				activeSprintId={activeSprintId}
				activeChatId={activeChatId}
				activeChatScope={activeChatScope}
				onSelectSprint={handleSelectSprint}
				onSelectChat={handleSelectChat}
				onSelectRegularChat={handleSelectRegularChat}
				onNewChat={handleNewChat}
			/>
			<ChatPanel
				chat={activeChat}
				repositoryName={activeRepo?.name ?? ""}
				sprintName={
					activeChatScope === "regular"
						? "main"
						: (activeSprint?.name ?? "main")
				}
				onSendMessage={handleSendMessage}
				onPromoteChat={handlePromoteChat}
				onMarkReady={handleMarkReady}
			/>
		</div>
	);

	const isScaffolderMode = topLevelTab === "scaffolder";

	useEffect(() => {
		if (!isScaffolderMode && repoMode === "opencode" && activeTab !== "chat") {
			setActiveTab("chat");
		}
	}, [activeTab, isScaffolderMode, repoMode, setActiveTab]);

	return (
		<div className="flex flex-col h-screen w-full bg-bg overflow-hidden text-fg">
			{/* Top navigation with Scaffolder/Repositories tabs + UserProfile */}
			<TopNav
				activeTab={topLevelTab}
				onTabChange={setTopLevelTab}
				isUserLoading={isUserLoading}
				serverConfigStatus={serverConfigStatus}
			/>

			{/* Repository mode toggle */}
			{!isScaffolderMode && (
				<div className="bg-bg-subtle border-b border-border px-4 py-2 flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setRepoMode("repo");
						}}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
							repoMode === "repo"
								? "bg-primary-900/30 text-fg border border-primary-600/40"
								: "text-fg-muted hover:text-fg hover:bg-secondary"
						}`}
					>
						Repo chats
					</button>
					<button
						type="button"
						onClick={() => {
							setRepoMode("opencode");
						}}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
							repoMode === "opencode"
								? "bg-primary-900/30 text-fg border border-primary-600/40"
								: "text-fg-muted hover:text-fg hover:bg-secondary"
						}`}
					>
						OpenCode (Local)
					</button>
				</div>
			)}

			{/* Repo tabs - only shown in Repositories mode */}
			{!isScaffolderMode && repoMode === "repo" && (
				<RepoTabs
					repositories={repositories}
					activeRepoId={activeRepoId}
					onSelectRepo={handleSelectRepo}
					onSelectBranch={handleSelectBranch}
					onAddRepo={handleAddRepo}
				/>
			)}

			{/* Main content area */}
			<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
				<div className="flex-1 overflow-hidden min-h-0">
					{isScaffolderMode ? (
						<AIChatContainer
							activeTab={activeTab}
							onTabChange={setActiveTab}
							isScaffolderRepo
						>
							{multiChatContent}
						</AIChatContainer>
					) : repoMode === "repo" ? (
						<AIChatContainer
							activeTab={activeTab}
							onTabChange={setActiveTab}
							isScaffolderRepo={false}
							repoUrl={activeRepo?.repoUrl}
							repoName={activeRepo?.name}
						>
							{multiChatContent}
						</AIChatContainer>
					) : (
						<OpenCodeChatPanel />
					)}
				</div>
				{(isScaffolderMode || repoMode === "repo") && (
					<TabBar
						activeTab={activeTab}
						onTabChange={setActiveTab}
						hasGeneratedCode={schemaInfo.length > 0}
					/>
				)}
			</div>
		</div>
	);
}
