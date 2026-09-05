import equal from "fast-deep-equal";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { IFile, IStructure } from "@/components/FileViewer.tsx";
import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import type { IScaffolderMessage } from "@/interfaces/scaffolderMessages.ts";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useUserStore } from "@/useUserStore.ts";
import {
	buildProjectFiles,
	type IBuildProjectFilesResult,
	type IFailedFormatEntry,
} from "@/utils/project-builder/buildProjectFiles.ts";

interface IProjectBuildCacheEntry {
	structure: IStructure;
	filesUsingUserEnv: string[];
	filesFailedToFormat: IFailedFormatEntry[];
	messages?: IScaffolderMessage[];
	hasErrors?: boolean;
	hasWarnings?: boolean;
}

type IProjectBuildCache = IProjectBuildCacheEntry;

export interface IProjectStore {
	projects: IFile[];
	selectedProject: IFile | null;
	projectBuildCache: Record<string, IProjectBuildCache>;
	selectProject: (project: IFile) => void;
	buildProjectFilesForProject: (
		project: IFile,
		schemaInfo: ISchemaInfo[],
		decryptedUserMetadata?: Record<string, unknown> | null,
	) => Promise<IBuildProjectFilesResult>;
	invalidateProjectCache: (projectName: string) => void;
	processFilesUpdate: (_userFiles: IStructure, projects: IFile[]) => void;
	updateProjects: (projects: IFile[]) => void;
}

const persistConfig = {
	name: "project-storage",
	storage: createJSONStorage(() => localStorage),
	partialize: (state: IProjectStore) => ({
		selectedProject: state.selectedProject,
		projectBuildCache: state.projectBuildCache,
	}),
};

const isUseCache = !true;

export const useProjectStore = create<IProjectStore>()(
	persist(
		(set, get) => ({
			projects: [],
			selectedProject: null,
			projectBuildCache: {},

			/**
			 * Selects a project
			 */
			selectProject: (project: IFile) => {
				const currentProject = get().selectedProject;

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!isUseCache) {
					// Invalidate the cache for the current project
					get().invalidateProjectCache(currentProject?.name ?? "");
				}

				// Only update if there's an actual change
				if (!currentProject || !equal(currentProject, project)) {
					set({ selectedProject: project });
				}
			},

			/**
			 * Updates the list of projects and selects the first one if none is selected
			 */
			updateProjects: (projects: IFile[]) => {
				const currentProjects = get().projects;

				// Only update if there's an actual change in the projects array
				if (!equal(currentProjects, projects)) {
					set({ projects });

					// Get current state
					const { selectedProject } = get();

					// If no project is selected or the selected project no longer exists, select the first one
					if (
						selectedProject === null ||
						!projects.some((p) => p.name === selectedProject.name)
					) {
						if (projects.length > 0) {
							get().selectProject(projects[0]);
						} else {
							set({ selectedProject: null });
						}
					}
				}
			},

			/**
			 * Invalidates the cache for a specific project
			 */
			invalidateProjectCache: (projectName: string) => {
				set((state) => {
					const newCache = { ...state.projectBuildCache };
					if (Object.hasOwn(newCache, projectName)) {
						// Use a safe way to delete property
						const { [projectName]: _, ...rest } = newCache;
						return { projectBuildCache: rest };
					}
					return { projectBuildCache: newCache };
				});
			},

			/**
			 * Process incoming files update from useMockDatabaseStore
			 */
			processFilesUpdate: (_userFiles: IStructure, projects: IFile[]) => {
				// Get current state including selected project
				const { selectedProject, projectBuildCache } = get();

				// Update our projects list first
				get().updateProjects(projects);

				// Check if any projects have been removed and clear their cache
				if (Object.keys(projectBuildCache).length > 0) {
					const existingProjectNames = projects.map((p) => p.name);
					const cachedProjectNames = Object.keys(projectBuildCache);

					// Find projects that are in cache but no longer exist
					const removedProjects = cachedProjectNames.filter(
						(name) => !existingProjectNames.includes(name),
					);

					// Invalidate cache for removed projects
					if (removedProjects.length > 0) {
						removedProjects.forEach((projectName) => {
							get().invalidateProjectCache(projectName);
						});
					}
				}

				// If we have a selected project but it's not in the updated projects list
				if (selectedProject !== null) {
					const stillExists = projects.some(
						(p) => p.name === selectedProject.name,
					);

					if (!stillExists) {
						// Select the first project if available
						if (projects.length > 0) {
							get().selectProject(projects[0]);
						} else {
							set({ selectedProject: null });
						}
					}
				} else if (projects.length > 0) {
					get().selectProject(projects[0]);
				}
			},

			/**
			 * Builds the files for a project, using cache if available.
			 *
			 * Performance optimization: Returns early if userFiles are not loaded to avoid
			 * unnecessary computation (YAML parsing, file searching, structure processing).
			 * This prevents wasted CPU cycles when the app reloads and selectedProject is
			 * restored from localStorage before userFiles are fetched from the API.
			 */
			buildProjectFilesForProject: async (
				project: IFile,
				schemaInfo: ISchemaInfo[],
				decryptedUserMetadata?: Record<string, unknown> | null,
			): Promise<IBuildProjectFilesResult> => {
				const { projectBuildCache } = get();

				// Check if we have a cached version that matches the current schema version
				if (Object.hasOwn(projectBuildCache, project.name)) {
					const cached = projectBuildCache[project.name];
					return {
						structure: cached.structure,
						filesUsingUserEnv: cached.filesUsingUserEnv,
						filesFailedToFormat: cached.filesFailedToFormat,
						messages: cached.messages ?? [],
						hasErrors: cached.hasErrors,
						hasWarnings: cached.hasWarnings,
					};
				}
				// Get all user files
				const { userFiles: allUserFiles } = useMockDatabaseStore.getState();

				// Performance optimization: Early return if userFiles are not loaded
				// Prevents unnecessary build pipeline execution when data isn't ready
				const hasNoUserFiles = allUserFiles.length === 0;
				if (hasNoUserFiles) {
					return {
						structure: [
							{
								type: "file",
								name: "user-files-not-loaded.log",
								content: [
									"⏳ USER FILES NOT LOADED",
									"",
									"📅 Timestamp:",
									new Date().toISOString(),
									"",
									"💡 Suggestion:",
									"User files are still loading. Please wait for the files to load before building the project.",
									"",
								].join("\n"),
							},
						],
						filesUsingUserEnv: [],
						filesFailedToFormat: [],
						messages: [],
						hasErrors: false,
						hasWarnings: false,
					};
				}

				// Get form data
				const formData = useFormStore.getState();

				// Use decrypted metadata if provided, otherwise fall back to store metadata
				const { userMetadata } = useUserStore.getState();
				const metadataToUse =
					decryptedUserMetadata !== undefined
						? decryptedUserMetadata
						: userMetadata;

				// Build project files using the project path
				// Use uniqueId if available, otherwise use the folder-based path
				const projectPath =
					project.uniqueId != null && project.uniqueId.length > 0
						? project.uniqueId
						: `/Projects/${project.name}/structure.yaml`;
				const buildResult = await buildProjectFiles(
					projectPath,
					allUserFiles,
					schemaInfo,
					formData,
					metadataToUse,
				);

				// Update cache with both structure and filesUsingUserEnv
				set((state) => ({
					projectBuildCache: {
						...state.projectBuildCache,
						[project.name]: {
							structure: buildResult.structure,
							filesUsingUserEnv: buildResult.filesUsingUserEnv,
							filesFailedToFormat: buildResult.filesFailedToFormat,
							messages: buildResult.messages ?? [],
							hasErrors: buildResult.hasErrors,
							hasWarnings: buildResult.hasWarnings,
						},
					},
				}));

				return buildResult;
			},
		}),
		persistConfig,
	),
);
