import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { IFile, IStructure } from "@/components/FileViewer.tsx";

/**
 * Scaffolder Store
 *
 * Manages state for the Scaffolder tab:
 * - User files (templates from GitHub/local)
 * - Projects list and selection
 * - File source preferences (local vs remote)
 *
 * Note: Schema transformations remain in useTransformationsStore for now
 * as they have complex dependencies. This store focuses on file/project state.
 */

// ============================================================================
// Types
// ============================================================================

export interface IScaffolderStore {
	// --- File Source Preferences (persisted, dev mode) ---
	/** Use local /files directory instead of remote GitHub repo (dev mode only) */
	useLocalFiles: boolean;
	setUseLocalFiles: (value: boolean) => void;

	/** Remote GitHub URL for scaffolder files when not using local */
	remoteFilesURL: string;
	setRemoteFilesURL: (url: string) => void;

	// --- User Files (from GitHub/local) ---
	/** All user files (templates, constants, projects) */
	userFiles: IStructure;
	setUserFiles: (files: IStructure) => void;

	/** Type mappings from Constants/typeMappings.yaml */
	typeMappings: Record<string, unknown> | undefined;
	setTypeMappings: (mappings: Record<string, unknown> | undefined) => void;

	/** Database types from Constants/dbTypes.yaml */
	dbTypes: string[] | undefined;
	setDbTypes: (types: string[] | undefined) => void;

	// --- Projects ---
	/** Available projects extracted from userFiles */
	projects: IFile[];
	setProjects: (projects: IFile[]) => void;

	/** Currently selected project */
	selectedProject: IFile | null;
	selectProject: (project: IFile | null) => void;

	// --- Project Build Cache ---
	/** Cache of built project files to avoid recomputation */
	projectBuildCache: Record<
		string,
		{
			structure: IStructure;
			filesUsingUserEnv: string[];
			filesFailedToFormat: { path: string; error: string }[];
		}
	>;
	/** Set cache entry for a project */
	setProjectBuildCache: (
		projectName: string,
		cache: {
			structure: IStructure;
			filesUsingUserEnv: string[];
			filesFailedToFormat: { path: string; error: string }[];
		},
	) => void;
	/** Invalidate (clear) cache for a project */
	invalidateProjectCache: (projectName: string) => void;
	/** Clear all project caches */
	clearAllProjectCaches: () => void;

	// --- Computed/Derived ---
	/** Check if files are loaded */
	hasUserFiles: () => boolean;

	/** Check if a project is selected */
	hasSelectedProject: () => boolean;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useScaffolderStore = create<IScaffolderStore>()(
	persist(
		(set, get) => ({
			// --- File Source Preferences ---
			useLocalFiles: true,
			setUseLocalFiles: (useLocalFiles) => set({ useLocalFiles }),

			remoteFilesURL: "https://github.com/judigot/scaffolder-files",
			setRemoteFilesURL: (remoteFilesURL) => set({ remoteFilesURL }),

			// --- User Files ---
			userFiles: [],
			setUserFiles: (userFiles) => set({ userFiles }),

			typeMappings: undefined,
			setTypeMappings: (typeMappings) => set({ typeMappings }),

			dbTypes: undefined,
			setDbTypes: (dbTypes) => set({ dbTypes }),

			// --- Projects ---
			projects: [],
			setProjects: (projects) => {
				const { selectedProject } = get();
				set({ projects });

				// Auto-select first project if none selected or current selection is invalid
				if (
					selectedProject === null ||
					!projects.some((p) => p.name === selectedProject.name)
				) {
					if (projects.length > 0) {
						set({ selectedProject: projects[0] });
					} else {
						set({ selectedProject: null });
					}
				}
			},

			selectedProject: null,
			selectProject: (project) => {
				const { selectedProject: current, invalidateProjectCache } = get();

				// Invalidate cache for previously selected project (ensures fresh build)
				if (current) {
					invalidateProjectCache(current.name);
				}

				set({ selectedProject: project });
			},

			// --- Project Build Cache ---
			projectBuildCache: {},
			setProjectBuildCache: (projectName, cache) => {
				set((state) => ({
					projectBuildCache: {
						...state.projectBuildCache,
						[projectName]: cache,
					},
				}));
			},
			invalidateProjectCache: (projectName) => {
				set((state) => {
					const { [projectName]: _, ...rest } = state.projectBuildCache;
					return { projectBuildCache: rest };
				});
			},
			clearAllProjectCaches: () => {
				set({ projectBuildCache: {} });
			},

			// --- Computed/Derived ---
			hasUserFiles: () => get().userFiles.length > 0,
			hasSelectedProject: () => get().selectedProject !== null,
		}),
		{
			name: "scaffolder-store",
			storage: createJSONStorage(() => localStorage),
			// Persist preferences and selection, not the full file content
			partialize: (state) => ({
				useLocalFiles: state.useLocalFiles,
				remoteFilesURL: state.remoteFilesURL,
				selectedProject: state.selectedProject,
				// Don't persist userFiles, projects, or cache - they're loaded fresh
			}),
		},
	),
);
