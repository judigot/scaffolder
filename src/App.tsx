import { useEffect, useState } from "react";
import type { IStructure } from "@/components/FileViewer.tsx";
import FileViewer from "@/components/FileViewer.tsx";
import JSONSchemaEditor from "@/components/JSONSchemaEditor/JSONSchemaEditor.tsx";
import { useModalStore } from "@/components/Modal/base/modalStore.tsx";
import SchemaBuilder from "@/components/SchemaBuilder.tsx";
import { SQLErrorModal } from "@/components/SQLErrorModal.tsx";
import { SimpleSelect } from "@/components/UI/GroupedSelect.tsx";
// import { folderStructureBuilder } from '@/frameworks/folderStructureBuilder.ts';
import UserProfile from "@/components/UserProfile.tsx";
import { CREATION_MODES } from "@/constants.ts";
import { handleCopy } from "@/helpers/stringHelper.ts";
import useDebouncedValue from "@/hooks/useDebouncedValue.ts";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserFiles } from "@/hooks/useUserFiles.ts";
import type { IGenerationStatus } from "@/interfaces/IGenerationStatus.ts";
import type { IIntrospectedSchemaInfo } from "@/interfaces/interfaces.ts";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useModalStore as useSQLModalStore } from "@/useModalStore.ts";
import { useProjectStore } from "@/useProjectStore.ts";
import { useTransformationsStore } from "@/useTransformationsStore.ts";
import { consolidateInterfaces } from "@/utils/common.ts";
import convertIntrospectedStructure from "@/utils/convertIntrospectedStructure.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import type { IFailedFormatEntry } from "@/utils/project-builder/buildProjectFiles.ts";
import { findProjectsFolderAtRoot } from "@/utils/project-builder/utils/findProjectsFolderAtRoot.ts";

function App() {
	const formData = useFormStore();
	const {
		user,
		userMetadata,
		isLoading: isUserLoading,
		serverConfigStatus,
	} = useUser();
	const { decryptedMetadata } = useDecryptedUserMetadata();
	const {
		backendUrl,
		backendDir,
		frontendDir,
		dbConnection,
		// framework,
		includeInsertData,
		insertOption,
		includeTypeGuards,
		outputOnSingleFile,
		dbType,
		setMasterSchema,
		setDBType,
		creationMode,
		setCreationMode,
		publicRepoURL,
		setPublicRepoURL,
	} = formData;

	const {
		schemaInfo,
		interfaces,
		SQLSchema,
		mockData,
		deleteTablesQueries,
		directJoins,
		oneToOneJoins,
		aggregateJoins,
		setTransformations,
		setSchemaInfo,
	} = useTransformationsStore();

	// const folderStructures = folderStructureBuilder({
	//   schemaInfo,
	//   formData,
	// });

	// Use both stores
	const {
		setUserFiles,
		typeMappings,
		dbTypes,
		userFiles: storeUserFiles,
	} = useMockDatabaseStore();

	const {
		projects,
		selectedProject,
		selectProject,
		buildProjectFilesForProject,
		projectBuildCache,
		invalidateProjectCache,
	} = useProjectStore();

	// Invalidate project cache when userMetadata or decryptedMetadata changes
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

	const [buildResult, setBuildResult] = useState<{
		structure: IStructure;
		filesUsingUserEnv: string[];
		filesFailedToFormat: IFailedFormatEntry[];
	}>({ structure: [], filesUsingUserEnv: [], filesFailedToFormat: [] });

	/**
	 * Builds project files when all prerequisites are met.
	 *
	 * Performance optimization: Checks that userFiles are loaded before triggering
	 * the build process. This prevents unnecessary async work when the app reloads
	 * and selectedProject is restored from localStorage before userFiles are fetched.
	 *
	 * The effect automatically rebuilds when userFiles become available (via storeUserFiles
	 * dependency), ensuring the project builds as soon as data is ready.
	 */
	useEffect(() => {
		const hasSelectedProject = selectedProject !== null;
		const hasUser = user !== null;
		const hasUserFiles = storeUserFiles.length > 0;
		const canBuildProject = hasSelectedProject && hasUser && hasUserFiles;

		if (canBuildProject) {
			// Build immediately, even if metadata is still loading
			// The builder works gracefully with null metadata (replaces USE_USER_ENV with empty strings)
			// When metadata becomes available, cache invalidation will trigger a rebuild
			void (async () => {
				const result = await buildProjectFilesForProject(
					selectedProject,
					schemaInfo,
					decryptedMetadata ?? null,
				);
				setBuildResult(result);
			})();
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
		schemaInfo,
		storeUserFiles,
	]);

	const builtProjectFiles = buildResult.structure;
	const filesUsingUserEnv = buildResult.filesUsingUserEnv;
	const filesFailedToFormat = buildResult.filesFailedToFormat;

	const [isLoading, setIsLoading] = useState<boolean>(false);

	// State for input value before being committed to store
	const [inputRepoURL, setInputRepoURL] = useState<string>(publicRepoURL);

	// Use TanStack Query to fetch GitHub files
	const {
		isLoading: isUserFilesLoading,
		refetch: refetchUserFiles,
		data: userFiles,
		error: userFilesQueryError,
	} = useUserFiles(
		{
			publicRepoURL,
		},
		{
			refetchInterval: 5 * 60 * 1000, // 1 second
			staleTime: 5 * 60 * 1000, // 1 second
			gcTime: 10 * 60 * 1000, // 10 minutes
			refetchOnWindowFocus: false, // Refetch on window focus — but only if stale
			enabled: !!publicRepoURL,
		},
	);

	// Handle GitHub data changes
	useEffect(() => {
		if (userFiles) {
			if (userFiles.length > 0) {
				// Just set the userFiles in the mock database store
				// The project store will handle detecting changes
				setUserFiles(userFiles);
			}
		}
	}, [userFiles, setUserFiles]);

	// Track schema changes
	useEffect(() => {
		// We don't need to rebuild files here - useTransformationsStore.setSchemaInfo already does this
		// The project files are automatically rebuilt when schema info changes
	}, []);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value, type } = e.target;
		if (name === "project") {
			const selectedProjectOption = projects.find((p) => p.name === value);
			if (selectedProjectOption) {
				if (selectedProject?.name !== selectedProjectOption.name) {
					selectProject(selectedProjectOption);
				}
			}
			return;
		}
		const checked = e.target instanceof HTMLInputElement && e.target.checked;
		const newFormData = {
			...useFormStore.getState(),
			[name]: type === "checkbox" ? checked : value,
		};
		useFormStore.setState(newFormData);
	};

	const { setIsSQLSchemaModalOpen, setSQLSchemaEditable } = useSQLModalStore();
	const { promptModal } = useModalStore();

	// Sanitize GitHub URL by removing spaces and unnecessary characters
	const sanitizeGitHubURL = (url: string): string => {
		// Remove all spaces
		return url.replace(/\s+/g, "").trim();
	};

	// Validate GitHub URL format
	const isValidGitHubURL = (url: string): boolean => {
		return url === "" || url.startsWith("https://github.com/");
	};

	// Use our custom hook to debounce updates to the Zustand store
	const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);

	// Update the Zustand store when the debounced value changes
	useEffect(() => {
		// Only update the store if the value has actually changed
		setPublicRepoURL(inputRepoURL);
		if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
			// Trigger a refetch when the URL changes
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

	const stringInterfaces = consolidateInterfaces(interfaces);

	const [generationStatus, setGenerationStatus] = useState<IGenerationStatus>({
		isBackendUrlValid: true,
		isBackendDirValid: true,
		isFrontendDirValid: true,
		isDBConnectionValid: true,
		errorMessage: null,
	});

	// Add a new effect for initial app startup
	useEffect(() => {
		// Check if we need to initialize on startup
		// Trigger an immediate refetch when app starts if a URL is provided
		if (publicRepoURL) {
			// Force a refetch on every reload to detect remote changes
			void refetchUserFiles();
		}
	}, [publicRepoURL, refetchUserFiles]);

	const showConfigBanner =
		!isUserLoading &&
		serverConfigStatus !== null &&
		serverConfigStatus.auth0ManagementApiConfigured === false;

	return (
		<div className="text-white bg-black">
			{showConfigBanner && (
				<div className="bg-black border-b border-red-700 pt-2 pb-2 px-4 sticky top-0 z-[60]">
					<div className="flex items-center justify-center gap-2">
						<svg
							className="w-4 h-4 text-red-400 flex-shrink-0"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-label="Error icon"
						>
							<title>Error icon</title>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
						<p className="text-xs text-red-300">
							<span className="font-medium">Developer Notice:</span> Auth0
							Management API credentials not configured. User metadata and
							GitHub token features unavailable. Set{" "}
							<code className="bg-red-900/50 px-1 py-0.5 rounded text-red-200">
								AUTH0_MANAGEMENT_API_CLIENT_ID
							</code>{" "}
							and{" "}
							<code className="bg-red-900/50 px-1 py-0.5 rounded text-red-200">
								AUTH0_MANAGEMENT_API_CLIENT_SECRET
							</code>{" "}
							in{" "}
							<code className="bg-red-900/50 px-1 py-0.5 rounded text-red-200">
								.env
							</code>
						</p>
					</div>
				</div>
			)}
			<nav
				className={`bg-gray-900 text-white p-2 sticky text-center border-b border-gray-700 ${
					showConfigBanner ? "top-[38px]" : "top-0"
				} z-50`}
			>
				<div className="absolute right-4 top-4 flex items-center gap-3">
					<UserProfile />
				</div>
				<div className="inline-block">
					<h1 className="text-2xl font-bold inline-block pl-5 pr-5">
						Scaffolder - Write Once, Generate Forever!
					</h1>
				</div>
				<form id="appGeneratorForm" name="appGeneratorForm">
					<div className="inline-block">
						<div className="inline-block text-sm font-medium mr-2">
							Schema Templates:
							<div className="flex items-center h-10">
								<button
									data-testid="one-to-one-button"
									type="button"
									onClick={() => {
										setMasterSchema();
									}}
									className="sm:mb-0 sm:mr-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
								>
									Master Schema
								</button>
							</div>
						</div>
						<div className="inline-block text-sm font-medium">
							Database Builder:
							<div>
								<SimpleSelect
									id="creationMode"
									name="creationMode"
									value={creationMode}
									onChange={(value) => {
										const isValueInObject = <T extends object>(
											obj: T,
											val: unknown,
										): val is T[keyof T] => {
											return Object.values(obj).includes(val);
										};

										if (isValueInObject(CREATION_MODES, value)) {
											setCreationMode(value);
										}
									}}
									options={Object.entries(CREATION_MODES).map(
										([_key, value]) => ({
											value,
											label: value,
										}),
									)}
									aria-label="Database creation mode"
								/>
							</div>
						</div>
						<div className="inline-block">
							<div className="inline-block text-sm font-medium mr-2">
								Backend URL:
								{!generationStatus.isBackendUrlValid && (
									<i className="block text-red-500">
										&nbsp;Backend URL not available
									</i>
								)}
								<input
									type="text"
									id="backendUrl"
									name="backendUrl"
									value={backendUrl}
									onChange={handleChange}
									className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
										generationStatus.isBackendUrlValid
											? "border-gray-700 focus:border-indigo-500"
											: "border-red-500 focus:border-red-500"
									}`}
								/>
							</div>
							<div className="inline-block text-sm font-medium mr-2">
								Backend Directory:
								{!generationStatus.isBackendDirValid && (
									<i className="block text-red-500">
										&nbsp;Invalid backend directory
									</i>
								)}
								<input
									type="text"
									id="backendDir"
									name="backendDir"
									value={backendDir}
									onChange={handleChange}
									className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
										generationStatus.isBackendDirValid
											? "border-gray-700 focus:border-indigo-500"
											: "border-red-500 focus:border-red-500"
									}`}
								/>
							</div>
							<div className="inline-block text-sm font-medium mr-2">
								Frontend Directory:
								{!generationStatus.isFrontendDirValid && (
									<i className="block text-red-500">
										&nbsp;Invalid frontend directory
									</i>
								)}
								<input
									type="text"
									id="frontendDir"
									name="frontendDir"
									value={frontendDir}
									onChange={handleChange}
									className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
										generationStatus.isFrontendDirValid
											? "border-gray-700 focus:border-indigo-500"
											: "border-red-500 focus:border-red-500"
									}`}
								/>
							</div>
							<div className="inline-block text-sm font-medium mr-2">
								Database Connection:
								{!generationStatus.isDBConnectionValid && (
									<i className="block text-red-500">
										&nbsp;Invalid connection string
									</i>
								)}
								<input
									type="text"
									id="dbConnection"
									name="dbConnection"
									value={dbConnection}
									onChange={handleChange}
									className={`h-10 p-2 block border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
										generationStatus.isDBConnectionValid
											? "border-gray-700 focus:border-indigo-500"
											: "border-red-500 focus:border-red-500"
									}`}
								/>
							</div>
							<div className="inline-block">
								<div className="inline-block text-sm font-medium mr-2">
									Database Type:
									<div className="flex items-center h-10">
										<button
											type="button"
											onClick={() => {
												setDBType("postgresql");
											}}
											className={`mr-2 sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
												dbType === "postgresql"
													? "bg-indigo-600 text-white"
													: "bg-gray-800 text-white"
											}`}
										>
											PostgreSQL
										</button>
										<button
											type="button"
											onClick={() => {
												setDBType("mysql");
											}}
											className={`sm:mb-0 px-2 py-0.5 rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${
												dbType === "mysql"
													? "bg-indigo-600 text-white"
													: "bg-gray-800 text-white"
											}`}
										>
											MySQL
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</form>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{selectedProject !== null && (
						<button
							data-testid="generate-app-button"
							type="button"
							onClick={() => {
								void (async () => {
									setIsLoading(true);
									try {
										const formDataForExport = {
											backendDir,
											publicRepoURL,
											dbConnection,
											projectName: selectedProject.name,
											selectedProject: {
												name: selectedProject.name,
												content: selectedProject.content,
												type: selectedProject.type,
												uniqueId: selectedProject.uniqueId,
											},
										};

										const response = await fetch(`${getApiUrl()}/scaffold`, {
											method: "POST",
											headers: {
												"Content-Type": "application/json",
											},
											body: JSON.stringify({
												schemaInfo,
												SQLSchema,
												formData: formDataForExport,
												userMetadata: decryptedMetadata ?? userMetadata ?? null,
											}),
										});

										if (!response.ok) {
											const errorData: unknown = await response.json();
											const errorMessage =
												errorData !== null &&
												typeof errorData === "object" &&
												"error" in errorData &&
												typeof errorData.error === "string"
													? errorData.error
													: "Failed to create app";
											throw new Error(errorMessage);
										}

										const data: unknown = await response.json();

										if (
											data !== null &&
											typeof data === "object" &&
											"isBackendUrlValid" in data &&
											"isBackendDirValid" in data &&
											"isFrontendDirValid" in data &&
											"isDBConnectionValid" in data
										) {
											const status: IGenerationStatus = {
												isBackendUrlValid:
													typeof data.isBackendUrlValid === "boolean"
														? data.isBackendUrlValid
														: false,
												isBackendDirValid:
													typeof data.isBackendDirValid === "boolean"
														? data.isBackendDirValid
														: false,
												isFrontendDirValid:
													typeof data.isFrontendDirValid === "boolean"
														? data.isFrontendDirValid
														: false,
												isDBConnectionValid:
													typeof data.isDBConnectionValid === "boolean"
														? data.isDBConnectionValid
														: false,
												errorMessage:
													"errorMessage" in data &&
													(typeof data.errorMessage === "string" ||
														data.errorMessage === null)
														? data.errorMessage
														: null,
												errorLine:
													"errorLine" in data &&
													(typeof data.errorLine === "number" ||
														data.errorLine === null)
														? data.errorLine
														: null,
												errorPosition:
													"errorPosition" in data &&
													(typeof data.errorPosition === "number" ||
														data.errorPosition === null)
														? data.errorPosition
														: null,
											};

											setGenerationStatus(status);

											// Show error modal if there's an error message
											if (
												status.errorMessage !== null &&
												status.errorMessage !== ""
											) {
												// Use SQLErrorModal if SQL schema and error details are available
												if (
													SQLSchema !== "" &&
													status.errorLine !== null &&
													status.errorLine !== undefined &&
													status.errorLine > 0
												) {
													const { openRandomModal } = useModalStore.getState();
													openRandomModal({
														title: "SQL Error",
														content: (
															<SQLErrorModal
																errorMessage={status.errorMessage}
																sqlSchema={SQLSchema}
																errorLine={status.errorLine}
																errorPosition={status.errorPosition ?? null}
															/>
														),
														size: "large",
													});
												} else {
													await promptModal({
														title: "Generation Error",
														description: status.errorMessage,
														confirmButtonText: "OK",
														denyButtonText: "",
													});
												}
											}
										} else {
											throw new Error("Invalid response format from server");
										}
									} catch (error: unknown) {
										const errorMsg =
											error instanceof Error
												? error.message
												: "An unknown error occurred";
										await promptModal({
											title: "Error",
											description: `Failed to create app: ${errorMsg}`,
											confirmButtonText: "OK",
											denyButtonText: "",
										});
									} finally {
										setIsLoading(false);
									}
								})();
							}}
							className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
						>
							{isLoading && "Generating..."}
							{!isLoading && (
								<>
									Create <strong>{selectedProject.name}</strong> App
									<span className="text-2xl">🪄</span>
								</>
							)}
						</button>
					)}
					<button
						type="button"
						onClick={() => {
							fetch(`${getApiUrl()}/introspect`, {
								// *GET, POST, PATCH, PUT, DELETE
								method: "POST",
								headers: {
									Accept: "application/json",
									"Content-Type": "application/json",
								},
								// For POST, PATCH, and PUT requests
								body: JSON.stringify({ dbConnection, dbType }),
							})
								.then((response) => response.json())
								.then((introspectedSchemaInfo: IIntrospectedSchemaInfo[]) => {
									const convertedSchemaInfo = convertIntrospectedStructure(
										introspectedSchemaInfo,
									);
									// const mockData = generateMockData({
									//   mockDataRows: 5,
									//   schemaInfo,
									// });
									// const newFormData = {
									//   ...useFormStore.getState(),
									//   schemaInput: JSON.stringify(mockData, null, 4),
									// };
									// setFormData(newFormData);

									setSchemaInfo(convertedSchemaInfo);

									setGenerationStatus({
										...generationStatus,

										isDBConnectionValid: true,
									});
								})
								.catch((error: unknown) => {
									/* prettier-ignore */ (() => {
										const QuickLog = error;
										const isObject = (
											obj: unknown,
										): obj is Record<string, unknown> => {
											return obj !== null && typeof obj === "object";
										};
										const isArrayOfObjects = (
											arr: unknown,
										): arr is Record<string, unknown>[] => {
											return Array.isArray(arr) && arr.every(isObject);
										};
										const parentDiv: HTMLElement =
											document.getElementById("quicklogContainer") ??
											(() => {
												const div = document.createElement("div");
												div.id = "quicklogContainer";
												div.style.cssText =
													"position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;";
												const helperButtonsDiv = document.createElement("div");
												helperButtonsDiv.style.cssText =
													"position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;";
												const clearButton = document.createElement("button");
												clearButton.textContent = "Clear";
												clearButton.style.cssText =
													"margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;";
												clearButton.onclick = () => {
													if (parentDiv instanceof HTMLElement) {
														parentDiv.remove();
													}
												};
												helperButtonsDiv.appendChild(clearButton);
												document.body.appendChild(div);
												div.appendChild(helperButtonsDiv);
												return div;
											})();
										const createTable = (
											obj: Record<string, unknown>,
										): HTMLTableElement => {
											const table = document.createElement("table");
											table.style.cssText =
												'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
											Object.entries(obj).forEach(([key, value]) => {
												const row = document.createElement("tr");
												const keyCell = document.createElement("td");
												const valueCell = document.createElement("td");
												keyCell.textContent = key;
												valueCell.textContent = String(value);
												keyCell.style.cssText =
													"border: 1px solid black; padding: 5px;";
												valueCell.style.cssText =
													"border: 1px solid black; padding: 5px;";
												row.appendChild(keyCell);
												row.appendChild(valueCell);
												table.appendChild(row);
											});
											return table;
										};
										const createTableFromArray = (
											arr: Record<string, unknown>[],
										): HTMLTableElement => {
											const table = document.createElement("table");
											table.style.cssText =
												'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;';
											const headers = Object.keys(arr[0]);
											const headerRow = document.createElement("tr");
											headers.forEach((header) => {
												const th = document.createElement("th");
												th.textContent = header;
												th.style.cssText =
													"border: 1px solid black; padding: 5px;";
												headerRow.appendChild(th);
											});
											table.appendChild(headerRow);
											arr.forEach((obj) => {
												const row = document.createElement("tr");
												headers.forEach((header) => {
													const td = document.createElement("td");
													td.textContent = String(obj[header]);
													td.style.cssText =
														"border: 1px solid black; padding: 5px;";
													row.appendChild(td);
												});
												table.appendChild(row);
											});
											return table;
										};
										const createChildDiv = (data: unknown): HTMLElement => {
											const newDiv = document.createElement("div");
											const jsonData = JSON.stringify(data, null, 2);
											if (isArrayOfObjects(data)) {
												const table = createTableFromArray(data);
												newDiv.appendChild(table);
											} else if (isObject(data)) {
												const table = createTable(data);
												newDiv.appendChild(table);
											} else {
												newDiv.textContent = String(data);
											}
											newDiv.style.cssText =
												'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;';
											const handleMouseDown = (e: MouseEvent) => {
												e.preventDefault();
												const clickedDiv =
													e.target instanceof Element &&
													e.target.closest("div");
												if (
													clickedDiv !== null &&
													e.button === 0 &&
													clickedDiv === newDiv
												) {
													void navigator.clipboard
														.writeText(jsonData)
														.then(() => {
															clickedDiv.style.backgroundColor = "gold";
															setTimeout(() => {
																clickedDiv.style.backgroundColor = "yellow";
															}, 1000);
														});
												}
											};
											const handleRightClick = (e: MouseEvent) => {
												e.preventDefault();
												if (parentDiv.contains(newDiv)) {
													parentDiv.removeChild(newDiv);
													if (!parentDiv.hasChildNodes()) {
														parentDiv.remove();
													}
												}
											};
											newDiv.addEventListener("mousedown", handleMouseDown);
											newDiv.addEventListener("contextmenu", handleRightClick);
											return newDiv;
										};
										parentDiv.prepend(createChildDiv(QuickLog));
									})();
									// Failure
									setGenerationStatus({
										...generationStatus,

										isDBConnectionValid: false,
									});
								});
						}}
						className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
					>
						<strong>Introspector</strong> - Generate Code From Existing Database
						<br />
						<i className="text-xs">{dbConnection}</i>
					</button>

					{process.env.NODE_ENV === "development" && (
						<>
							<button
								type="button"
								title={JSON.stringify(
									schemaInfo.map(
										({
											requiredColumns: _1,
											columnsInfo: _2,
											foreignKeys: _3,
											...newObject
										}) => newObject,
									),
									null,
									4,
								)}
								onClick={(e) => {
									e.preventDefault();

									handleCopy(
										JSON.stringify(
											schemaInfo.map(
												({
													requiredColumns: _1,
													columnsInfo: _2,
													foreignKeys: _3,
													...newObject
												}) => newObject,
											),
											null,
											4,
										),
									);
								}}
								className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
							>
								Copy Schema Info
							</button>

							<button
								type="button"
								title={JSON.stringify(schemaInfo, null, 4)}
								onClick={(e) => {
									e.preventDefault();
									handleCopy(JSON.stringify(schemaInfo, null, 4));
								}}
								className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
							>
								Copy Schema Info with Columns
							</button>
						</>
					)}
				</div>
			</nav>

			<div className="p-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="bg-gray-700 p-4 shadow-md rounded-md">
						{creationMode === CREATION_MODES.SCHEMA_BUILDER && (
							<>
								<h2 className="text-xl font-bold mb-2">Schema Builder</h2>
								<SchemaBuilder />
							</>
						)}
						{/* @ts-expect-error: JSONSchemaEditor is temporarily disabled */}
						{creationMode === CREATION_MODES.JSON_SCHEMA && (
							<>
								<h2 className="text-xl font-bold mb-2">JSON Database Schema</h2>
								<JSONSchemaEditor />
							</>
						)}
						{/* <div>
              <div className="block text-sm font-medium">
                Additional Schema Settings:
                <AdditionalSchemaSettings />
              </div>
            </div> */}
					</div>

					<div className="bg-gray-800 p-4 shadow-md rounded-md">
						<h2 className="text-xl font-bold mb-2">Generated Code</h2>
						<div className="block text-sm font-medium">
							Public GitHub Repository URL:
							<input
								id="publicRepoURL"
								name="publicRepoURL"
								type="text"
								placeholder="Public repository URL: e.g., https://github.com/user/scaffolder-files"
								value={inputRepoURL}
								onChange={(e) => {
									const sanitizedValue = sanitizeGitHubURL(e.target.value);
									setInputRepoURL(sanitizedValue);
								}}
								className={`mb-2 p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
									!isValidGitHubURL(inputRepoURL) && inputRepoURL !== ""
										? "border-red-500"
										: "border-gray-700"
								}`}
								onKeyDown={(e) => {
									if (inputRepoURL && e.key === "Enter") {
										e.preventDefault();
										// Re-fetch when the user presses Enter
										void refetchUserFiles();
									}
								}}
							/>
							{!isValidGitHubURL(inputRepoURL) && inputRepoURL !== "" && (
								<div className="text-red-500 text-xs mt-1">
									URL must start with https://github.com/
								</div>
							)}
						</div>
						{!inputRepoURL && (
							<div className="flex items-center text-gray-500 justify-center h-40 rounded-md">
								Please enter a GitHub repository URL to generate code
							</div>
						)}
						{inputRepoURL && isValidGitHubURL(inputRepoURL) && (
							<div>
								{(() => {
									if (isUserFilesLoading) {
										return (
											<div className="flex items-center justify-center h-40 rounded-md">
												<div className="text-white">
													<svg
														className="animate-spin -ml-1 mr-3 h-10 w-10 text-white inline-block"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														aria-label="Loading"
													>
														<title>Loading spinner</title>
														<circle
															className="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															strokeWidth="4"
														></circle>
														<path
															className="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
														></path>
													</svg>
													Loading repository files...
												</div>
											</div>
										);
									}

									if (userFilesQueryError) {
										return (
											<div className="flex items-center justify-center h-40 rounded-md">
												<div className="text-red-500 text-center p-4">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														className="h-10 w-10 text-red-500 inline-block mb-2"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														aria-label="Error icon"
													>
														<title>Error</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
														/>
													</svg>
													<div className="font-bold mb-2">
														Error Loading Repository Files
													</div>
													<div>{userFilesQueryError.message}</div>
												</div>
											</div>
										);
									}

									if (selectedProject !== null) {
										return (
											<>
												{/* <div className="bg-blue-500  text-white font-bold">
                        <FileViewer
                          folderColor={'yellow'}
                          folderStructure={folderStructures[framework]}
                        />
                      </div>
                      <div className="bg-green-500 flex text-white font-bold">
                        <FileViewer
                          folderColor={'green'}
                          folderStructure={folderStructures.frontend}
                        />
                      </div> */}
												{/* <FileViewer mode="edit" folderStructure={[]} /> */}
												{process.env.NODE_ENV === "development" && (
													<>
														<div>
															<button
																type="button"
																className="bg-gray-500 text-white px-2 py-1 rounded-md"
																onClick={() => {
																	invalidateProjectCache(selectedProject.name);
																}}
															>
																Clear Project Cache
															</button>
															<br />
															<code>
																Cached projects:
																{JSON.stringify(
																	Object.keys(projectBuildCache),
																	null,
																	4,
																)}
															</code>
														</div>
														<br />
														<code>
															Selected project:
															<br />
															{selectedProject.name}
															<br />
															{selectedProject.content.substring(0, 20)}
															...
															<br />
															<br />
														</code>
													</>
												)}
												<label htmlFor="project">Project:</label>
												<SimpleSelect
													id="project"
													name="project"
													value={selectedProject.name}
													onChange={(value) => {
														const selectedProjectOption = projects.find(
															(p) => p.name === value,
														);
														if (selectedProjectOption) {
															if (
																selectedProject?.name !==
																selectedProjectOption.name
															) {
																selectProject(selectedProjectOption);
															}
														}
													}}
													options={projects.map((project) => ({
														value: project.name,
														label: project.name,
													}))}
													aria-label="Select project"
												/>
												<FileViewer
													mode="edit"
													folderStructure={builtProjectFiles}
													projectName={selectedProject.name}
													filesUsingUserEnv={filesUsingUserEnv}
													filesFailedToFormat={filesFailedToFormat}
												/>
												{/* <FileViewer
                          mode="edit"
                          folderStructure={folderStructures.Laravel}
                        /> */}
												{/* <FileViewer
                        mode="view"
                        folderStructure={folderStructures.frontend}
                      /> */}
											</>
										);
									}

									// Fallback: If repository files are loaded but no compatible project found,
									// display the repository as a read-only file viewer
									if (userFiles && userFiles.length > 0) {
										const hasProjectsFolder =
											findProjectsFolderAtRoot(userFiles) !== undefined;

										return (
											<>
												<div className="mb-4 p-3 bg-gray-900/30 border border-gray-700 rounded-md">
													<div className="flex items-start gap-2">
														<svg
															className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
																clipRule="evenodd"
															/>
														</svg>
														<div className="flex-1">
															<p className="text-sm font-medium text-blue-300">
																Repository Viewer
															</p>
															<p className="text-xs text-blue-200/80 mt-1">
																This repository doesn&apos;t contain a
																compatible project structure for the scaffolder.
																Displaying files in read-only mode.
															</p>
															<div className="mt-2 flex items-center gap-2">
																<a
																	href="/documentation/structure/"
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-xs text-gray-400 hover:text-blue-300 underline"
																>
																	Learn how to set up a scaffolder project →
																</a>
															</div>
														</div>
													</div>
												</div>

												{!hasProjectsFolder && (
													<div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded-md">
														<div className="flex items-start gap-2">
															<svg
																className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fillRule="evenodd"
																	d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
																	clipRule="evenodd"
																/>
															</svg>
															<div className="flex-1">
																<p className="text-sm font-medium text-amber-300">
																	Missing Projects Folder
																</p>
																<p className="text-xs text-amber-200/80 mt-1">
																	This repository needs a{" "}
																	<code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-200">
																		Projects/
																	</code>{" "}
																	folder at the root level containing project
																	structure definitions (
																	<code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-200">
																		structure.yaml
																	</code>
																	).
																</p>
															</div>
														</div>
													</div>
												)}

												<div className="mb-4 flex items-center gap-2">
													<button
														type="button"
														onClick={() => {
															// TODO: Implement repository conversion
														}}
														className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
													>
														Convert this repository
													</button>
													<span className="text-xs text-gray-400">
														Scaffold a basic structure for this repository
													</span>
												</div>

												<FileViewer mode="view" folderStructure={userFiles} />
											</>
										);
									}
								})()}
							</div>
						)}
					</div>
				</div>
				<br />
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-gray-800 p-4 shadow-md rounded-md">
						<div>
							<h2 className="text-xl font-bold mb-2">Create Tables</h2>
							<textarea
								id="SQLSchema"
								title="Double click to edit schema"
								value={SQLSchema}
								readOnly
								onDoubleClick={() => {
									setSQLSchemaEditable(SQLSchema);
									setIsSQLSchemaModalOpen(true);
								}}
								rows={15}
								className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
							/>
							<div className="block text-sm font-medium mt-4">
								<input
									data-testid="include-insert-data-checkbox"
									type="checkbox"
									id="includeInsertData"
									name="includeInsertData"
									checked={includeInsertData}
									onChange={handleChange}
									className="mr-2"
								/>
								Include Insert Data
							</div>
							{includeInsertData && (
								<div className="mt-2">
									{/* @ts-expect-error: JSONSchemaEditor is temporarily disabled */}
									{creationMode === CREATION_MODES.JSON_SCHEMA && (
										<div className="block text-sm font-medium">
											<input
												type="radio"
												name="insertOption"
												value="SQLInsertQueries"
												checked={insertOption === "SQLInsertQueries"}
												onChange={handleChange}
												className="mr-2"
											/>
											Rows from JSON Database Schema
										</div>
									)}

									<div className="block text-sm font-medium">
										<input
											type="radio"
											name="insertOption"
											value="SQLInsertQueriesFromMockData"
											checked={insertOption === "SQLInsertQueriesFromMockData"}
											onChange={handleChange}
											className="mr-2"
										/>
										Rows from mock data
									</div>
								</div>
							)}
							<button
								type="button"
								onClick={() => {
									handleCopy(SQLSchema);
								}}
								className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
							>
								Copy Database Schema
							</button>
							<br />
							<br />
							{/* {schemaInput !== '' && dbConnection !== '' && (
              <>
                <br />
                <button
                  onClick={() => {
                    handleCopy(SQLSchema);
                  }}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Execute Query
                </button>
              </>
            )} */}
						</div>
						<div>
							<h2 className="text-xl font-bold mb-2">Delete Tables</h2>
							<div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
								{deleteTablesQueries.map((value) => (
									<p key={value} className="whitespace-pre-wrap">
										{value}
									</p>
								))}
							</div>
							<button
								type="button"
								onClick={() => {
									handleCopy(deleteTablesQueries.join("\n"));
								}}
								className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
							>
								Copy Delete Queries
							</button>
						</div>
					</div>

					<div className="bg-gray-800 p-4 shadow-md rounded-md">
						<h2 className="text-xl font-bold mb-2">Mock Data</h2>
						<textarea
							id="mockData"
							value={JSON.stringify(mockData, null, 2)}
							readOnly
							rows={10}
							className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
						/>
						<button
							type="button"
							onClick={() => {
								handleCopy(JSON.stringify(mockData, null, 2));
							}}
							className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
						>
							Copy Mock Data
						</button>
					</div>

					<div className="bg-gray-800 p-4 shadow-md rounded-md">
						{directJoins.length > 0 && (
							<>
								<h2 className="text-xl font-bold mb-2">Direct Join Queries</h2>
								<div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
									{directJoins.map((value) => (
										<div key={value}>
											<p className="whitespace-pre-wrap">{value}</p>
											<br />
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => {
										handleCopy(directJoins.join("\n"));
									}}
									className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
								>
									Copy Join Queries
								</button>
								<br />
								<br />
							</>
						)}
						{oneToOneJoins.length > 0 && (
							<>
								<h2 className="text-xl font-bold mb-2">
									One-to-One Join Queries (One-to-One)
								</h2>
								<div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
									{oneToOneJoins.map((value) => (
										<div key={value}>
											<p className="whitespace-pre-wrap">{value}</p>
											<br />
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => {
										handleCopy(oneToOneJoins.join("\n"));
									}}
									className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
								>
									Copy Join Queries
								</button>
								<br />
								<br />
							</>
						)}
						{aggregateJoins.length > 0 && (
							<>
								<h2 className="text-xl font-bold mb-2">
									Aggregate Join Queries (One-to-Many and Many-to-Many)
								</h2>
								<div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
									{aggregateJoins.map((value) => (
										<div key={value}>
											<p className="whitespace-pre-wrap">{value}</p>
											<br />
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => {
										handleCopy(aggregateJoins.join("\n"));
									}}
									className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
								>
									Copy Join Queries
								</button>
							</>
						)}
					</div>

					<div className="bg-gray-800 p-4 shadow-md rounded-md">
						<div className="float-right">
							<div className="block text-sm font-medium mt-4">
								<input
									type="checkbox"
									id="includeTypeGuards"
									name="includeTypeGuards"
									checked={includeTypeGuards}
									onChange={handleChange}
									className="mr-2"
								/>
								Include Type Guards
							</div>
							<div className="block text-sm font-medium mt-4">
								<input
									type="checkbox"
									id="outputOnSingleFile"
									name="outputOnSingleFile"
									checked={outputOnSingleFile}
									onChange={handleChange}
									className="mr-2"
								/>
								Output on a Single File
							</div>
						</div>
						<br />
						<h2 className="text-xl font-bold mb-2">TypeScript Interfaces</h2>
						<br />
						<div className="">
							{outputOnSingleFile ? (
								<>
									<h3 className="text-base font-semibold text-white mb-2">
										interfaces.ts
									</h3>
									<textarea
										id="interfaces"
										value={stringInterfaces}
										readOnly
										rows={10}
										className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
									/>
								</>
							) : (
								<div className="max-h-96 overflow-y-auto">
									{Object.entries(interfaces).map(
										([interfaceName, content]) => (
											<div key={interfaceName} className="mb-4">
												<h3 className="text-base font-semibold text-white mb-2">
													{interfaceName}.ts
												</h3>
												<textarea
													id={`interface-${interfaceName}`}
													name={`interface-${interfaceName}`}
													value={content}
													readOnly
													rows={10}
													className="h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
												/>
												<button
													type="button"
													onClick={() => {
														handleCopy(content);
													}}
													className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
												>
													Copy {interfaceName}
												</button>
											</div>
										),
									)}
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={() => {
								handleCopy(stringInterfaces);
							}}
							className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
						>
							Copy All Interfaces
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
