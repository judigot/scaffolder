import { create } from "zustand";

interface IUserProfileStore {
	isOpen: boolean;
	activePanel: "home" | "githubToken" | "env" | "infra";
	openUserProfile: (panel?: "home" | "githubToken" | "env" | "infra") => void;
	closeUserProfile: () => void;
	setActivePanel: (panel: "home" | "githubToken" | "env" | "infra") => void;
}

export const useUserProfileStore = create<IUserProfileStore>((set) => ({
	isOpen: false,
	activePanel: "home",
	openUserProfile: (panel = "home") => {
		set({ isOpen: true, activePanel: panel });
	},
	closeUserProfile: () => {
		set({ isOpen: false, activePanel: "home" });
	},
	setActivePanel: (panel) => {
		set({ activePanel: panel });
	},
}));
