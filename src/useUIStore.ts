import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TabType } from "@/components/AI/TabBar.tsx";

/**
 * Global UI Store
 *
 * This store contains ONLY global navigation state that spans across tabs.
 * Domain-specific state is in dedicated stores:
 * - useScaffolderStore: Scaffolder tab state
 * - useRepositoriesStore: Repositories tab state
 *
 * Local UI state (dropdowns, modals, form inputs) should remain
 * in the component that owns it.
 */

// ============================================================================
// Constants
// ============================================================================

/** Is the app running in development environment (NODE_ENV=development) */
export const isDevEnvironment = import.meta.env.DEV;

/** Check if user is the master developer/owner of the app (judigot) */
export const isMasterDeveloper = (nickname: string | undefined): boolean =>
	nickname === "judigot";

// ============================================================================
// Types
// ============================================================================

/** Top-level navigation: scaffolder mode vs repository browser vs master view */
export type TopLevelTab = "scaffolder" | "repositories" | "master";

// ============================================================================
// Store Interface
// ============================================================================

interface IUIStore {
	// --- Navigation (persisted) ---
	// These determine what the user sees and should survive page refresh

	/** Which top-level mode the user is in */
	topLevelTab: TopLevelTab;
	setTopLevelTab: (tab: TopLevelTab) => void;

	/** Which content tab is active (chat, code viewer, infra) */
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUIStore = create<IUIStore>()(
	persist(
		(set) => ({
			// Navigation
			topLevelTab: "scaffolder",
			setTopLevelTab: (topLevelTab) => set({ topLevelTab }),

			activeTab: "chat",
			setActiveTab: (activeTab) => set({ activeTab }),
		}),
		{
			name: "ui-preferences",
			storage: createJSONStorage(() => localStorage),
			// Persist user's navigation state so they return where they left off
			partialize: (state) => ({
				topLevelTab: state.topLevelTab,
				activeTab: state.activeTab,
			}),
		},
	),
);
