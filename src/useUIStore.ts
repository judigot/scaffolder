import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TabType } from "@/components/AI/TabBar.tsx";

/** Top-level navigation tabs */
export type TopLevelTab = "scaffolder" | "repositories";

/** Chat scope within a repository */
export type ChatScope = "sprint" | "regular";

interface IUIStore {
	// === Navigation State ===
	/** Top-level tab: scaffolder vs repositories */
	topLevelTab: TopLevelTab;
	setTopLevelTab: (tab: TopLevelTab) => void;

	/** Inner tab: chat, fileViewer, or infra */
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;

	// === Repository State ===
	/** Currently selected repository ID */
	activeRepoId: string | null;
	setActiveRepoId: (id: string | null) => void;

	/** Currently open repo dropdown (for repo list) */
	openRepoDropdownId: string | null;
	setOpenRepoDropdownId: (id: string | null) => void;

	// === Sprint/Chat State ===
	/** Currently selected sprint ID */
	activeSprintId: string | null;
	setActiveSprintId: (id: string | null) => void;

	/** Currently selected chat ID */
	activeChatId: string | null;
	setActiveChatId: (id: string | null) => void;

	/** Chat scope: sprint-level or regular */
	activeChatScope: ChatScope;
	setActiveChatScope: (scope: ChatScope) => void;

	// === UI Visibility State ===
	/** Whether add repo modal is visible */
	showAddRepoModal: boolean;
	setShowAddRepoModal: (show: boolean) => void;

	/** Repo ID pending delete confirmation */
	deleteConfirmRepoId: string | null;
	setDeleteConfirmRepoId: (id: string | null) => void;

	// === Helpers ===
	/** Reset repository-related state (when switching top-level tabs) */
	resetRepoState: () => void;
}

export const useUIStore = create<IUIStore>()(
	persist(
		(set) => ({
			// Navigation
			topLevelTab: "scaffolder",
			setTopLevelTab: (topLevelTab) => {
				set({ topLevelTab });
			},

			activeTab: "chat",
			setActiveTab: (activeTab) => {
				set({ activeTab });
			},

			// Repository
			activeRepoId: null,
			setActiveRepoId: (activeRepoId) => {
				set({ activeRepoId });
			},

			openRepoDropdownId: null,
			setOpenRepoDropdownId: (openRepoDropdownId) => {
				set({ openRepoDropdownId });
			},

			// Sprint/Chat
			activeSprintId: null,
			setActiveSprintId: (activeSprintId) => {
				set({ activeSprintId });
			},

			activeChatId: null,
			setActiveChatId: (activeChatId) => {
				set({ activeChatId });
			},

			activeChatScope: "regular",
			setActiveChatScope: (activeChatScope) => {
				set({ activeChatScope });
			},

			// UI Visibility
			showAddRepoModal: false,
			setShowAddRepoModal: (showAddRepoModal) => {
				set({ showAddRepoModal });
			},

			deleteConfirmRepoId: null,
			setDeleteConfirmRepoId: (deleteConfirmRepoId) => {
				set({ deleteConfirmRepoId });
			},

			// Helpers
			resetRepoState: () => {
				set({
					activeRepoId: null,
					openRepoDropdownId: null,
					activeSprintId: null,
					activeChatId: null,
					activeChatScope: "regular",
					showAddRepoModal: false,
					deleteConfirmRepoId: null,
				});
			},
		}),
		{
			name: "ui-preferences",
			storage: createJSONStorage(() => localStorage),
			// Only persist certain fields (not modals or temporary state)
			partialize: (state) => ({
				topLevelTab: state.topLevelTab,
				activeTab: state.activeTab,
				activeRepoId: state.activeRepoId,
				activeSprintId: state.activeSprintId,
				activeChatScope: state.activeChatScope,
			}),
		},
	),
);
