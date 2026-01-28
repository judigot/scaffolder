import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TabType } from "@/components/AI/TabBar.tsx";

/**
 * Global UI Store
 *
 * This store contains ONLY state that:
 * 1. Needs to be shared across multiple components, OR
 * 2. Should persist across page refreshes (user preferences)
 *
 * Local UI state (dropdowns, modals, form inputs) should remain
 * in the component that owns it.
 */

// ============================================================================
// Types
// ============================================================================

/** Top-level navigation: scaffolder mode vs repository browser */
export type TopLevelTab = "scaffolder" | "repositories";

/** Chat context: within a sprint or standalone */
export type ChatScope = "sprint" | "regular";

// ============================================================================
// Store Interface
// ============================================================================

interface UIStore {
	// --- Navigation (persisted) ---
	// These determine what the user sees and should survive page refresh

	/** Which top-level mode the user is in */
	topLevelTab: TopLevelTab;
	setTopLevelTab: (tab: TopLevelTab) => void;

	/** Which content tab is active (chat, code viewer, infra) */
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;

	// --- Repository Context (persisted) ---
	// These track the user's current working context

	/** Which repository the user is working in */
	activeRepoId: string | null;
	setActiveRepoId: (id: string | null) => void;

	/** Which sprint is selected within the repository */
	activeSprintId: string | null;
	setActiveSprintId: (id: string | null) => void;

	/** Which chat conversation is active */
	activeChatId: string | null;
	setActiveChatId: (id: string | null) => void;

	/** Whether viewing sprint chats or standalone chats */
	activeChatScope: ChatScope;
	setActiveChatScope: (scope: ChatScope) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUIStore = create<UIStore>()(
	persist(
		(set) => ({
			// Navigation
			topLevelTab: "scaffolder",
			setTopLevelTab: (topLevelTab) => set({ topLevelTab }),

			activeTab: "chat",
			setActiveTab: (activeTab) => set({ activeTab }),

			// Repository context
			activeRepoId: null,
			setActiveRepoId: (activeRepoId) => set({ activeRepoId }),

			activeSprintId: null,
			setActiveSprintId: (activeSprintId) => set({ activeSprintId }),

			activeChatId: null,
			setActiveChatId: (activeChatId) => set({ activeChatId }),

			activeChatScope: "regular",
			setActiveChatScope: (activeChatScope) => set({ activeChatScope }),
		}),
		{
			name: "ui-preferences",
			storage: createJSONStorage(() => localStorage),
			// Persist user's navigation state so they return where they left off
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
