import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
	IChat,
	IMessage,
	IRepository,
	ISprint,
} from "@/components/AI/chat-app/types.ts";

/**
 * Repositories Store
 *
 * Manages state for the Repositories tab:
 * - List of repositories (persisted URLs in Auth0, local state here)
 * - Active repository, sprint, chat selection
 * - Chat messages and worktree state
 *
 * Note: Repository URLs are persisted to Auth0 via useRepositories hook.
 * This store manages the runtime state (chats, sprints, messages).
 */

// ============================================================================
// Types
// ============================================================================

/** Chat context: within a sprint or standalone */
export type ChatScope = "sprint" | "regular";

interface IRepositoriesStore {
	// --- Repository List ---
	/** All repositories with their local state (sprints, chats) */
	repositories: IRepository[];
	setRepositories: (
		repos: IRepository[] | ((prev: IRepository[]) => IRepository[]),
	) => void;

	// --- Active Selection (persisted) ---
	/** Currently active repository ID */
	activeRepoId: string | null;
	setActiveRepoId: (id: string | null) => void;

	/** Currently active sprint ID within the repository */
	activeSprintId: string | null;
	setActiveSprintId: (id: string | null) => void;

	/** Currently active chat ID */
	activeChatId: string | null;
	setActiveChatId: (id: string | null) => void;

	/** Whether viewing sprint chats or standalone chats */
	activeChatScope: ChatScope;
	setActiveChatScope: (scope: ChatScope) => void;

	// --- Computed Getters ---
	/** Get the currently active repository */
	getActiveRepo: () => IRepository | null;

	/** Get the currently active sprint */
	getActiveSprint: () => ISprint | null;

	/** Get the currently active chat */
	getActiveChat: () => IChat | null;

	// --- Repository Actions ---
	/** Add a new repository */
	addRepository: (repo: IRepository) => void;

	/** Remove a repository by ID */
	removeRepository: (repoId: string) => void;

	/** Update a repository */
	updateRepository: (
		repoId: string,
		updates: Partial<Omit<IRepository, "id">>,
	) => void;

	// --- Sprint Actions ---
	/** Add a sprint to a repository */
	addSprint: (repoId: string, sprint: ISprint) => void;

	/** Update a sprint */
	updateSprint: (
		repoId: string,
		sprintId: string,
		updates: Partial<Omit<ISprint, "id">>,
	) => void;

	/** Remove a sprint */
	removeSprint: (repoId: string, sprintId: string) => void;

	// --- Chat Actions ---
	/** Add a chat to a repository (standalone) or sprint */
	addChat: (repoId: string, chat: IChat, sprintId?: string) => void;

	/** Update a chat */
	updateChat: (
		repoId: string,
		chatId: string,
		updates: Partial<Omit<IChat, "id">>,
		sprintId?: string,
	) => void;

	/** Remove a chat */
	removeChat: (repoId: string, chatId: string, sprintId?: string) => void;

	// --- Message Actions ---
	/** Add a message to a chat */
	addMessage: (
		repoId: string,
		chatId: string,
		message: IMessage,
		sprintId?: string,
	) => void;

	/** Update messages in a chat (replace all) */
	setMessages: (
		repoId: string,
		chatId: string,
		messages: IMessage[],
		sprintId?: string,
	) => void;

	// --- Initialization ---
	/** Initialize repositories from persisted Auth0 data */
	initializeFromPersistedRepos: (repos: IRepository[]) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useRepositoriesStore = create<IRepositoriesStore>()(
	persist(
		(set, get) => ({
			// --- Repository List ---
			repositories: [],
			setRepositories: (repos) => {
				if (typeof repos === "function") {
					set((state) => ({ repositories: repos(state.repositories) }));
				} else {
					set({ repositories: repos });
				}
			},

			// --- Active Selection ---
			activeRepoId: null,
			setActiveRepoId: (activeRepoId) => set({ activeRepoId }),

			activeSprintId: null,
			setActiveSprintId: (activeSprintId) => set({ activeSprintId }),

			activeChatId: null,
			setActiveChatId: (activeChatId) => set({ activeChatId }),

			activeChatScope: "regular",
			setActiveChatScope: (activeChatScope) => set({ activeChatScope }),

			// --- Computed Getters ---
			getActiveRepo: () => {
				const { repositories, activeRepoId } = get();
				return repositories.find((r) => r.id === activeRepoId) ?? null;
			},

			getActiveSprint: () => {
				const repo = get().getActiveRepo();
				const { activeSprintId } = get();
				if (repo === null || activeSprintId === null) {
					return null;
				}
				return repo.sprints.find((s) => s.id === activeSprintId) ?? null;
			},

			getActiveChat: () => {
				const repo = get().getActiveRepo();
				const { activeChatId, activeChatScope, activeSprintId } = get();
				if (repo === null || activeChatId === null) {
					return null;
				}

				if (activeChatScope === "sprint" && activeSprintId !== null) {
					const sprint = repo.sprints.find((s) => s.id === activeSprintId);
					return sprint?.chats.find((c) => c.id === activeChatId) ?? null;
				}
				return repo.chats.find((c) => c.id === activeChatId) ?? null;
			},

			// --- Repository Actions ---
			addRepository: (repo) => {
				set((state) => ({
					repositories: [...state.repositories, repo],
				}));
			},

			removeRepository: (repoId) => {
				set((state) => {
					const newRepos = state.repositories.filter((r) => r.id !== repoId);
					// Clear active selection if removed repo was active
					const updates: Partial<IRepositoriesStore> = {
						repositories: newRepos,
					};
					if (state.activeRepoId === repoId) {
						updates.activeRepoId = newRepos[0]?.id ?? null;
						updates.activeSprintId = null;
						updates.activeChatId = null;
					}
					return updates;
				});
			},

			updateRepository: (repoId, updates) => {
				set((state) => ({
					repositories: state.repositories.map((r) =>
						r.id === repoId ? { ...r, ...updates } : r,
					),
				}));
			},

			// --- Sprint Actions ---
			addSprint: (repoId, sprint) => {
				set((state) => ({
					repositories: state.repositories.map((r) =>
						r.id === repoId ? { ...r, sprints: [...r.sprints, sprint] } : r,
					),
				}));
			},

			updateSprint: (repoId, sprintId, updates) => {
				set((state) => ({
					repositories: state.repositories.map((r) =>
						r.id === repoId
							? {
									...r,
									sprints: r.sprints.map((s) =>
										s.id === sprintId ? { ...s, ...updates } : s,
									),
								}
							: r,
					),
				}));
			},

			removeSprint: (repoId, sprintId) => {
				set((state) => ({
					repositories: state.repositories.map((r) =>
						r.id === repoId
							? { ...r, sprints: r.sprints.filter((s) => s.id !== sprintId) }
							: r,
					),
				}));
			},

			// --- Chat Actions ---
			addChat: (repoId, chat, sprintId) => {
				set((state) => ({
					repositories: state.repositories.map((r) => {
						if (r.id !== repoId) {
							return r;
						}

						if (sprintId !== undefined) {
							// Add to sprint
							return {
								...r,
								sprints: r.sprints.map((s) =>
									s.id === sprintId ? { ...s, chats: [...s.chats, chat] } : s,
								),
							};
						}
						// Add as standalone chat
						return { ...r, chats: [...r.chats, chat] };
					}),
				}));
			},

			updateChat: (repoId, chatId, updates, sprintId) => {
				set((state) => ({
					repositories: state.repositories.map((r) => {
						if (r.id !== repoId) {
							return r;
						}

						if (sprintId !== undefined) {
							return {
								...r,
								sprints: r.sprints.map((s) =>
									s.id === sprintId
										? {
												...s,
												chats: s.chats.map((c) =>
													c.id === chatId ? { ...c, ...updates } : c,
												),
											}
										: s,
								),
							};
						}
						return {
							...r,
							chats: r.chats.map((c) =>
								c.id === chatId ? { ...c, ...updates } : c,
							),
						};
					}),
				}));
			},

			removeChat: (repoId, chatId, sprintId) => {
				set((state) => ({
					repositories: state.repositories.map((r) => {
						if (r.id !== repoId) {
							return r;
						}

						if (sprintId !== undefined) {
							return {
								...r,
								sprints: r.sprints.map((s) =>
									s.id === sprintId
										? { ...s, chats: s.chats.filter((c) => c.id !== chatId) }
										: s,
								),
							};
						}
						return { ...r, chats: r.chats.filter((c) => c.id !== chatId) };
					}),
				}));
			},

			// --- Message Actions ---
			addMessage: (repoId, chatId, message, sprintId) => {
				get().updateChat(
					repoId,
					chatId,
					{
						messages: [...(get().getActiveChat()?.messages ?? []), message],
						updatedAt: new Date(),
					},
					sprintId,
				);
			},

			setMessages: (repoId, chatId, messages, sprintId) => {
				get().updateChat(
					repoId,
					chatId,
					{ messages, updatedAt: new Date() },
					sprintId,
				);
			},

			// --- Initialization ---
			initializeFromPersistedRepos: (repos) => {
				set((state) => {
					// Merge with existing local state (preserve sprints/chats)
					const existingMap = new Map(state.repositories.map((r) => [r.id, r]));
					const merged = repos.map((repo) => {
						const existing = existingMap.get(repo.id);
						if (existing) {
							// Keep local sprints/chats, update rest
							return {
								...repo,
								sprints: existing.sprints,
								chats: existing.chats,
							};
						}
						return repo;
					});
					return { repositories: merged };
				});
			},
		}),
		{
			name: "repositories-store",
			storage: createJSONStorage(() => localStorage),
			// Only persist selection state, not the full repositories
			// (repositories come from Auth0 + mock data)
			partialize: (state) => ({
				activeRepoId: state.activeRepoId,
				activeSprintId: state.activeSprintId,
				activeChatId: state.activeChatId,
				activeChatScope: state.activeChatScope,
			}),
		},
	),
);
