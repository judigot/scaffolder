import { create } from "zustand";

export interface IWorkspaceStatus {
	enableEc2: boolean;
	outputs: Record<string, unknown>;
	currentRunId: string | null;
	currentRunStatus: string | null;
	updatedAt: string | null;
	lastFetched: number;
}

export interface IInfraStore {
	workspaceStatuses: Record<string, IWorkspaceStatus>;
	setWorkspaceStatus: (
		workspace: string,
		status: Partial<IWorkspaceStatus>,
	) => void;
	getWorkspaceStatus: (workspace: string) => IWorkspaceStatus | null;
	clearWorkspaceStatus: (workspace: string) => void;
	clearAllStatuses: () => void;
}

const DEFAULT_STATUS: IWorkspaceStatus = {
	enableEc2: false,
	outputs: {},
	currentRunId: null,
	currentRunStatus: null,
	updatedAt: null,
	lastFetched: 0,
};

export const useInfraStore = create<IInfraStore>((set, get) => ({
	workspaceStatuses: {},

	setWorkspaceStatus: (workspace, status) => {
		set((state) => ({
			workspaceStatuses: {
				...state.workspaceStatuses,
				[workspace]: {
					...(state.workspaceStatuses[workspace] ?? DEFAULT_STATUS),
					...status,
					lastFetched: Date.now(),
				},
			},
		}));
	},

	getWorkspaceStatus: (workspace) => {
		const state = get();
		return state.workspaceStatuses[workspace] ?? null;
	},

	clearWorkspaceStatus: (workspace) => {
		set((state) => {
			const { [workspace]: _, ...rest } = state.workspaceStatuses;
			return { workspaceStatuses: rest };
		});
	},

	clearAllStatuses: () => {
		set({ workspaceStatuses: {} });
	},
}));
