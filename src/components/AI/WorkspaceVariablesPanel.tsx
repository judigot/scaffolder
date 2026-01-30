import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { SmartEnvPaste } from "@/components/UI/SmartEnvPaste.tsx";
import type { ISmartEnvMergeResult } from "@/utils/envParser.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";

interface IWorkspaceVariable {
	id: string;
	key: string;
	value: string | null;
	category: "env" | "terraform";
	sensitive: boolean;
}

interface IVariablesResponse {
	success: boolean;
	variables: IWorkspaceVariable[];
}

interface ILocalVariable {
	key: string;
	value: string;
	category: "env" | "terraform";
	sensitive: boolean;
	isNew?: boolean;
}

interface IWorkspaceVariablesPanelProps {
	workspace: string;
	accessToken: string | null;
	tfcToken: string;
	tfcOrg: string;
	isExpanded: boolean;
	onToggle: () => void;
}

const SYSTEM_VARIABLES = new Set([
	"AWS_ACCESS_KEY_ID",
	"AWS_SECRET_ACCESS_KEY",
	"AWS_SESSION_TOKEN",
	"TF_VAR_ssh_public_key",
	"TF_VAR_enable_ec2",
	"TF_VAR_instance_type",
	"TF_VAR_enable_rds",
	"TF_VAR_db_instance_class",
]);

export function WorkspaceVariablesPanel({
	workspace,
	accessToken,
	tfcToken,
	tfcOrg,
	isExpanded,
	onToggle,
}: IWorkspaceVariablesPanelProps) {
	const queryClient = useQueryClient();
	const [localVariables, setLocalVariables] = useState<ILocalVariable[]>([]);
	const [hasChanges, setHasChanges] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [clipboardToast, setClipboardToast] = useState<string | null>(null);
	const clipboardToastTimerRef = useRef<number | null>(null);

	const showClipboardToast = useCallback((message: string) => {
		if (clipboardToastTimerRef.current !== null) {
			window.clearTimeout(clipboardToastTimerRef.current);
		}
		setClipboardToast(message);
		clipboardToastTimerRef.current = window.setTimeout(() => {
			setClipboardToast(null);
			clipboardToastTimerRef.current = null;
		}, 2000);
	}, []);

	const variablesQuery = useQuery({
		queryKey: ["workspace-variables", tfcToken, tfcOrg, workspace],
		enabled:
			isExpanded &&
			workspace !== "" &&
			tfcToken !== "" &&
			tfcOrg !== "" &&
			accessToken !== null &&
			accessToken !== "",
		staleTime: 30_000,
		queryFn: async () => {
			if (accessToken === null || accessToken === "") {
				throw new Error("Missing access token");
			}
			const response = await fetch(
				`${getApiUrl()}/terraform/workspace/${encodeURIComponent(workspace)}/variables`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ tfcToken, tfcOrg }),
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch workspace variables");
			}
			// eslint-disable-next-line no-type-assertion/no-type-assertion
			return (await response.json()) as IVariablesResponse;
		},
	});

	const userVariables = useMemo(() => {
		if (variablesQuery.data?.variables === undefined) {
			return [];
		}
		return variablesQuery.data.variables.filter(
			(v) => !SYSTEM_VARIABLES.has(v.key),
		);
	}, [variablesQuery.data]);

	const displayVariables = useMemo(() => {
		if (hasChanges) {
			return localVariables;
		}
		return userVariables.map((v) => ({
			key: v.key,
			value: v.value ?? "",
			category: v.category,
			sensitive: v.sensitive,
		}));
	}, [hasChanges, localVariables, userVariables]);

	const saveMutation = useMutation({
		mutationFn: async (variables: ILocalVariable[]) => {
			if (accessToken === null || accessToken === "") {
				throw new Error("Missing access token");
			}
			const response = await fetch(
				`${getApiUrl()}/terraform/workspace/${encodeURIComponent(workspace)}/variables`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						tfcToken,
						tfcOrg,
						variables: variables.map((v) => ({
							key: v.key,
							value: v.value,
							category: v.category,
							sensitive: v.sensitive,
						})),
					}),
				},
			);
			if (!response.ok) {
				const errorBody: unknown = await response.json().catch(() => null);
				const message =
					errorBody !== null &&
					typeof errorBody === "object" &&
					"message" in errorBody &&
					// eslint-disable-next-line no-type-assertion/no-type-assertion
					typeof (errorBody as Record<string, unknown>).message === "string"
						? // eslint-disable-next-line no-type-assertion/no-type-assertion
							(errorBody as Record<string, string>).message
						: "Failed to save variables";
				throw new Error(message);
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return response.json();
		},
		onSuccess: () => {
			setHasChanges(false);
			setError(null);
			void queryClient.invalidateQueries({
				queryKey: ["workspace-variables", tfcToken, tfcOrg, workspace],
			});
			showClipboardToast("Variables saved");
		},
		onError: (err: unknown) => {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Failed to save variables");
			}
		},
	});

	const handleAddVariable = useCallback(() => {
		const newVars: ILocalVariable[] = hasChanges
			? [...localVariables]
			: displayVariables.map((v) => ({ ...v }));
		newVars.push({
			key: "",
			value: "",
			category: "env",
			sensitive: false,
			isNew: true,
		});
		setLocalVariables(newVars);
		setHasChanges(true);
	}, [hasChanges, localVariables, displayVariables]);

	const handleUpdateVariable = useCallback(
		(index: number, field: "key" | "value", value: string) => {
			const newVars: ILocalVariable[] = hasChanges
				? [...localVariables]
				: displayVariables.map((v) => ({ ...v }));

			newVars[index] = { ...newVars[index], [field]: value };
			setLocalVariables(newVars);
			setHasChanges(true);
		},
		[hasChanges, localVariables, displayVariables],
	);

	const handleRemoveVariable = useCallback(
		(index: number) => {
			const newVars: ILocalVariable[] = hasChanges
				? [...localVariables]
				: displayVariables.map((v) => ({ ...v }));
			newVars.splice(index, 1);
			setLocalVariables(newVars);
			setHasChanges(true);
		},
		[hasChanges, localVariables, displayVariables],
	);

	const handleSave = useCallback(() => {
		const validVars = localVariables.filter((v) => v.key.trim() !== "");
		if (validVars.length === 0) {
			setError("Add at least one variable with a key");
			return;
		}
		saveMutation.mutate(validVars);
	}, [localVariables, saveMutation]);

	const handleCancel = useCallback(() => {
		setLocalVariables([]);
		setHasChanges(false);
		setError(null);
	}, []);

	const handleCopy = useCallback(async () => {
		const vars = hasChanges ? localVariables : displayVariables;
		if (vars.length === 0) {
			showClipboardToast("No variables to copy");
			return;
		}
		const envString = vars
			.filter((v) => v.key.trim() !== "")
			.map((v) => {
				const value = v.value.includes(" ") ? `"${v.value}"` : v.value;
				return `${v.key}=${value}`;
			})
			.join("\n");
		try {
			await navigator.clipboard.writeText(envString);
			showClipboardToast("Copied to clipboard");
		} catch {
			showClipboardToast("Failed to copy");
		}
	}, [hasChanges, localVariables, displayVariables, showClipboardToast]);

	const handleSmartEnvMerge = useCallback(
		(result: ISmartEnvMergeResult<ILocalVariable>) => {
			setLocalVariables(result.entries);
			setHasChanges(true);
		},
		[],
	);

	const createEntry = useCallback(
		(key: string, value: string): ILocalVariable => ({
			key,
			value,
			category: "env",
			sensitive: false,
			isNew: true,
		}),
		[],
	);

	if (!isExpanded) {
		return (
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center py-2 text-xs text-fg-muted hover:text-fg transition-colors"
			>
				<svg
					className="w-3.5 h-3.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Variables</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				<span className="ml-1.5">Environment Variables</span>
				<svg
					className="w-4 h-4 ml-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Expand</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		);
	}

	return (
		<div className="pt-3 border-t border-border space-y-3">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onToggle}
					className="flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
				>
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Variables</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Environment Variables
					<svg
						className="w-4 h-4 rotate-180"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Collapse</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => {
							void handleCopy();
						}}
						className="p-1.5 text-fg-muted hover:text-fg hover:bg-secondary-hover rounded transition-colors"
						title="Copy as .env"
					>
						<svg
							className="w-3.5 h-3.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Copy</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					</button>
				</div>
			</div>

			{variablesQuery.isLoading && (
				<div className="py-4 flex items-center justify-center">
					<div className="w-5 h-5 border-2 border-border border-t-primary-500 rounded-full animate-spin" />
				</div>
			)}

			{variablesQuery.error && (
				<div className="p-2 bg-red-900/30 border border-red-700/50 rounded-md text-xs text-red-200">
					Failed to load variables
				</div>
			)}

			{!variablesQuery.isLoading && !variablesQuery.error && (
				<>
					<div className="mb-2">
						<SmartEnvPaste
							existing={hasChanges ? localVariables : displayVariables}
							createEntry={createEntry}
							onMerge={handleSmartEnvMerge}
						/>
					</div>

					{displayVariables.length === 0 ? (
						<p className="text-xs text-fg-subtle py-2">
							No custom variables yet. Add variables to configure your
							workspace.
						</p>
					) : (
						<div className="space-y-2">
							{displayVariables.map((variable, index) => (
								<div
									key={`${variable.key}-${String(index)}`}
									className="flex items-center gap-2"
								>
									<input
										type="text"
										value={variable.key}
										onChange={(e) => {
											handleUpdateVariable(index, "key", e.target.value);
										}}
										placeholder="KEY"
										className="flex-1 min-w-0 px-2 py-1.5 bg-bg-muted border border-border rounded text-xs font-mono text-fg focus:outline-none focus:ring-1 focus:ring-primary-500"
									/>
									<span className="text-fg-muted">=</span>
									<input
										type="text"
										value={variable.value}
										onChange={(e) => {
											handleUpdateVariable(index, "value", e.target.value);
										}}
										placeholder="value"
										className="flex-[2] min-w-0 px-2 py-1.5 bg-bg-muted border border-border rounded text-xs font-mono text-fg focus:outline-none focus:ring-1 focus:ring-primary-500"
									/>
									<button
										type="button"
										onClick={() => {
											handleRemoveVariable(index);
										}}
										className="p-1.5 text-fg-muted hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
										title="Remove variable"
									>
										<svg
											className="w-3.5 h-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<title>Remove</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							))}
						</div>
					)}

					<button
						type="button"
						onClick={handleAddVariable}
						className="w-full py-1.5 border border-dashed border-border hover:border-fg-muted rounded text-xs text-fg-muted hover:text-fg transition-colors flex items-center justify-center gap-1"
					>
						<svg
							className="w-3.5 h-3.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Add</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Variable
					</button>

					{error !== null && error !== "" && (
						<p className="text-xs text-red-300">{error}</p>
					)}

					{hasChanges && (
						<div className="flex items-center gap-2 pt-2">
							<button
								type="button"
								onClick={handleCancel}
								disabled={saveMutation.isPending}
								className="flex-1 px-3 py-1.5 border border-border hover:bg-secondary-hover text-fg-muted text-xs rounded transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={saveMutation.isPending}
								className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
							>
								{saveMutation.isPending ? (
									<>
										<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Saving...
									</>
								) : (
									"Save Variables"
								)}
							</button>
						</div>
					)}
				</>
			)}

			{clipboardToast !== null && clipboardToast !== "" && (
				<div className="fixed bottom-4 right-4 px-4 py-2 bg-bg-muted border border-border rounded-lg shadow-lg text-sm text-fg animate-in fade-in slide-in-from-bottom-2 z-50">
					{clipboardToast}
				</div>
			)}
		</div>
	);
}
