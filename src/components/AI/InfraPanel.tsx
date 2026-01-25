import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceVariablesPanel } from "@/components/AI/WorkspaceVariablesPanel.tsx";
import CustomModal from "@/components/Modal/base/CustomModal.tsx";
import GroupedSelect, { SimpleSelect } from "@/components/UI/GroupedSelect.tsx";
import ToggleSwitch from "@/components/UI/ToggleSwitch.tsx";
import {
	DEFAULT_EC2_INSTANCE_TYPE,
	DEFAULT_RDS_INSTANCE_TYPE,
	EC2_INSTANCE_GROUPS,
	RDS_INSTANCE_GROUPS,
	WORKSPACE_MODES,
	type WorkspaceMode,
} from "@/constants/awsInstanceTypes.ts";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserProfileStore } from "@/useUserProfileStore.ts";
import { hasEncryptedInfraValues } from "@/utils/decryptUserMetadata.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import { isRecord } from "@/utils/typeGuards.ts";

const WORKSPACE_MODE_OPTIONS = [
	{
		value: WORKSPACE_MODES.API,
		label: "Ubuntu EC2",
		description: "API-driven with Ubuntu template",
	},
	{
		value: WORKSPACE_MODES.VCS,
		label: "VCS-connected",
		description: "Link to a GitHub repository",
	},
];

interface IInfraCredentials {
	sshPublicKey: string;
	sshPrivateKey: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsSessionToken: string;
	tfcToken: string;
	tfcOrg: string;
}

interface ITfcWorkspace {
	id: string;
	name: string;
}

interface IWorkspacesResponse {
	success: boolean;
	workspaces: ITfcWorkspace[];
}

interface ITerraformRunResponse {
	run: {
		id: string;
		status: string;
	};
}

interface ITerraformStatusResponse {
	enableEc2: boolean;
	outputs: Record<string, unknown>;
}

const TERMINAL_STATUSES = new Set([
	"applied",
	"planned_and_finished",
	"errored",
	"canceled",
	"discarded",
]);

const parseInfraCredentials = (
	metadata: Record<string, unknown> | null,
): IInfraCredentials => {
	if (metadata && isRecord(metadata.infra)) {
		return {
			sshPublicKey:
				typeof metadata.infra.sshPublicKey === "string"
					? metadata.infra.sshPublicKey
					: "",
			sshPrivateKey:
				typeof metadata.infra.sshPrivateKey === "string"
					? metadata.infra.sshPrivateKey
					: "",
			awsAccessKeyId:
				typeof metadata.infra.awsAccessKeyId === "string"
					? metadata.infra.awsAccessKeyId
					: "",
			awsSecretAccessKey:
				typeof metadata.infra.awsSecretAccessKey === "string"
					? metadata.infra.awsSecretAccessKey
					: "",
			awsSessionToken:
				typeof metadata.infra.awsSessionToken === "string"
					? metadata.infra.awsSessionToken
					: "",
			tfcToken:
				typeof metadata.infra.tfcToken === "string"
					? metadata.infra.tfcToken
					: "",
			tfcOrg:
				typeof metadata.infra.tfcOrg === "string" ? metadata.infra.tfcOrg : "",
		};
	}
	return {
		sshPublicKey: "",
		sshPrivateKey: "",
		awsAccessKeyId: "",
		awsSecretAccessKey: "",
		awsSessionToken: "",
		tfcToken: "",
		tfcOrg: "",
	};
};

export type { IInfraCredentials };

interface IInfraPanelProps {
	onConnectAgent?: () => void;
}

interface IInfraWorkspaceCardProps {
	workspace: string;
	accessToken: string | null;
	infraCredentials: IInfraCredentials;
	infraReady: boolean;
	awsReady: boolean;
	tfcReady: boolean;
	infraHasEncryptedValues: boolean;
	isMetadataLoading: boolean;
	isDeleting: boolean;
	onConnectAgent?: () => void;
	onOpenProfile: () => void;
	onDelete: () => void;
}

function InfraWorkspaceCard({
	workspace,
	accessToken,
	infraCredentials,
	infraReady,
	awsReady,
	tfcReady,
	infraHasEncryptedValues,
	isMetadataLoading,
	isDeleting,
	onConnectAgent,
	onOpenProfile,
	onDelete,
}: IInfraWorkspaceCardProps) {
	const [enableEc2, setEnableEc2] = useState<boolean>(false);
	const [runStatus, setRunStatus] = useState<string | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [outputs, setOutputs] = useState<Record<string, unknown>>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [showVariables, setShowVariables] = useState<boolean>(false);
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [editEc2Type, setEditEc2Type] = useState<string>(
		DEFAULT_EC2_INSTANCE_TYPE,
	);
	const [editEnableRds, setEditEnableRds] = useState<boolean>(false);
	const [editRdsClass, setEditRdsClass] = useState<string>(
		DEFAULT_RDS_INSTANCE_TYPE,
	);
	const previousValueRef = useRef<boolean>(false);

	const workspaceValue = workspace.trim();
	const workspaceLabel = workspaceValue !== "" ? workspaceValue : "Workspace";

	const toggleVariables = useCallback(() => {
		setShowVariables((prev) => !prev);
	}, []);

	const statusQuery = useQuery({
		queryKey: [
			"terraform-status",
			infraCredentials.tfcToken,
			infraCredentials.tfcOrg,
			workspaceValue,
		],
		enabled:
			!isMetadataLoading &&
			workspaceValue !== "" &&
			infraReady &&
			accessToken !== null &&
			accessToken !== "" &&
			!isLoading,
		staleTime: 30_000,
		queryFn: async () => {
			if (accessToken === null || accessToken === "") {
				throw new Error("Missing access token");
			}
			const response = await fetch(`${getApiUrl()}/terraform/status`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tfcToken: infraCredentials.tfcToken,
					tfcOrg: infraCredentials.tfcOrg,
					tfcWorkspace: workspaceValue,
				}),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch Terraform status");
			}
			return (await response.json()) as ITerraformStatusResponse;
		},
	});

	useEffect(() => {
		if (statusQuery.data) {
			setEnableEc2(Boolean(statusQuery.data.enableEc2));
			setOutputs(statusQuery.data.outputs ?? {});
		}
	}, [statusQuery.data]);

	useEffect(() => {
		if (statusQuery.error instanceof Error) {
			setError(statusQuery.error.message);
		}
	}, [statusQuery.error]);

	const shouldShowSkeleton =
		isMetadataLoading || (!statusQuery.data && statusQuery.isLoading);
	const shouldShowNotices = !shouldShowSkeleton;
	const updatedLabel = useMemo(() => {
		if (!statusQuery.data) {
			return "Not updated yet";
		}
		if (statusQuery.isFetching && !statusQuery.isLoading) {
			return "Updating...";
		}
		const updatedAt = statusQuery.dataUpdatedAt;
		if (!updatedAt) {
			return "Updated just now";
		}
		const deltaMs = Date.now() - updatedAt;
		if (deltaMs < 60_000) {
			return "Updated just now";
		}
		const minutes = Math.floor(deltaMs / 60_000);
		if (minutes < 60) {
			return `Updated ${String(minutes)}m ago`;
		}
		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `Updated ${String(hours)}h ago`;
		}
		const days = Math.floor(hours / 24);
		return `Updated ${String(days)}d ago`;
	}, [
		statusQuery.data,
		statusQuery.dataUpdatedAt,
		statusQuery.isFetching,
		statusQuery.isLoading,
	]);

	useEffect(() => {
		if (!runId || accessToken === null || accessToken === "") {
			return;
		}
		if (!infraReady || workspaceValue === "") {
			return;
		}
		let timeoutId: number | null = null;
		let isActive = true;

		const poll = async () => {
			if (!isActive) {
				return;
			}
			try {
				const response = await fetch(`${getApiUrl()}/terraform/run/${runId}`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						tfcToken: infraCredentials.tfcToken,
						tfcOrg: infraCredentials.tfcOrg,
						tfcWorkspace: workspaceValue,
					}),
				});
				if (!response.ok) {
					throw new Error("Failed to fetch Terraform run status");
				}
				const result = (await response.json()) as ITerraformRunResponse & {
					success?: boolean;
				};
				setRunStatus(result.run.status);
				if (!TERMINAL_STATUSES.has(result.run.status)) {
					timeoutId = window.setTimeout(poll, 4000);
					return;
				}
				setIsLoading(false);
				await statusQuery.refetch();
			} catch (pollError: unknown) {
				if (pollError instanceof Error) {
					setError(pollError.message);
				}
				setIsLoading(false);
			}
		};

		void poll();

		return () => {
			isActive = false;
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId);
			}
		};
	}, [
		runId,
		accessToken,
		statusQuery.refetch,
		infraReady,
		infraCredentials.tfcToken,
		infraCredentials.tfcOrg,
		workspaceValue,
	]);

	const toggleMutation = useMutation({
		mutationFn: async (nextValue: boolean) => {
			const response = await fetch(`${getApiUrl()}/terraform/run`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					enableEc2: nextValue,
					awsAccessKeyId: infraCredentials.awsAccessKeyId,
					awsSecretAccessKey: infraCredentials.awsSecretAccessKey,
					awsSessionToken: infraCredentials.awsSessionToken,
					sshPublicKey: infraCredentials.sshPublicKey,
					tfcToken: infraCredentials.tfcToken,
					tfcOrg: infraCredentials.tfcOrg,
					tfcWorkspace: workspaceValue,
				}),
			});
			if (!response.ok) {
				const errorBody: unknown = await response.json().catch(() => null);
				const serverMessage =
					errorBody !== null &&
					typeof errorBody === "object" &&
					"message" in errorBody &&
					typeof (errorBody as Record<string, unknown>).message === "string"
						? (errorBody as Record<string, string>).message
						: "Failed to trigger Terraform run";
				throw new Error(serverMessage);
			}
			return (await response.json()) as ITerraformRunResponse;
		},
		onMutate: (nextValue: boolean) => {
			previousValueRef.current = enableEc2;
			setEnableEc2(nextValue);
			setError(null);
			setIsLoading(true);
		},
		onSuccess: (data) => {
			setRunId(data.run.id);
			setRunStatus(data.run.status);
		},
		onError: (err: unknown) => {
			setEnableEc2(previousValueRef.current);
			setIsLoading(false);
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Failed to trigger Terraform run");
			}
		},
	});

	const handleToggle = () => {
		if (accessToken === null || accessToken === "") {
			return;
		}
		if (!infraReady) {
			setError("Add and unlock your infrastructure credentials first.");
			return;
		}
		if (workspaceValue === "") {
			setError("Add a Terraform Cloud workspace first.");
			return;
		}
		toggleMutation.mutate(!enableEc2);
	};

	const publicIp = outputs.dev_ip;
	const sshCommand = outputs.ssh_command;
	const hasPublicIp = typeof publicIp === "string" && publicIp !== "";
	const showConnectionDetails = enableEc2 && hasPublicIp;

	return (
		<div className="p-4 bg-bg-muted border border-border rounded-lg space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-fg-muted">
						Terraform Workspace
					</p>
					<p className="text-lg font-semibold text-fg">{workspaceLabel}</p>
					{shouldShowSkeleton ? (
						<div className="mt-2 h-3 w-20 bg-border rounded animate-pulse" />
					) : (
						<div className="mt-1 space-y-1">
							<p className="text-xs text-fg-subtle">
								{enableEc2 ? "Provisioned" : "Stopped"}
							</p>
							<p className="text-[11px] text-fg-muted">{updatedLabel}</p>
						</div>
					)}
				</div>
				<ToggleSwitch
					checked={enableEc2}
					onChange={handleToggle}
					disabled={
						isLoading || !infraReady || shouldShowSkeleton || isDeleting
					}
					label="Toggle EC2 instance"
				/>
			</div>

			{!infraReady && !tfcReady && shouldShowNotices && (
				<div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-md text-xs text-blue-200 space-y-2">
					<p className="font-medium">Connect Terraform Cloud</p>
					<p>
						Add your Terraform Cloud API token, organization, and workspace in
						the profile panel to enable infrastructure control.
					</p>
					<button
						type="button"
						onClick={onOpenProfile}
						className="mt-1 px-3 py-1.5 bg-blue-700/40 hover:bg-blue-700/60 text-blue-100 rounded text-xs transition-colors"
					>
						Open Profile
					</button>
				</div>
			)}

			{!infraReady && tfcReady && !awsReady && shouldShowNotices && (
				<div className="p-3 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200">
					Add your SSH public key and AWS credentials in the profile panel to
					enable toggling.
				</div>
			)}

			{!infraReady && infraHasEncryptedValues && shouldShowNotices && (
				<div className="p-3 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200">
					Unlock your credentials with your passphrase to enable toggling.
				</div>
			)}

			{error !== null && error !== "" && (
				<div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-xs text-red-200">
					{error}
				</div>
			)}

			{isLoading && runStatus !== null && (
				<div className="p-3 bg-secondary border border-border rounded-md">
					<p className="text-xs text-fg-subtle">Run Status</p>
					<p className="text-sm text-fg mt-1">{runStatus}</p>
				</div>
			)}

			{showConnectionDetails && !shouldShowSkeleton && (
				<div className="pt-2 border-t border-border space-y-3">
					<p className="text-sm font-medium text-fg">Connection Details</p>
					<div className="text-xs text-fg-subtle space-y-2">
						<div>
							<p className="text-[11px] uppercase tracking-wide text-fg-muted">
								Public IP
							</p>
							<div className="flex items-center gap-2">
								<a
									href={`http://${publicIp}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-primary-400 hover:text-primary-300 hover:underline break-all"
								>
									{publicIp}
								</a>
								<button
									type="button"
									onClick={() => {
										void navigator.clipboard.writeText(publicIp ?? "");
									}}
									className="p-1 text-fg-muted hover:text-fg hover:bg-secondary-hover rounded transition-colors"
									title="Copy IP"
								>
									<svg
										className="w-4 h-4"
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
						<div>
							<p className="text-[11px] uppercase tracking-wide text-fg-muted">
								SSH Command
							</p>
							<div className="flex items-start gap-2">
								<p className="text-sm text-fg break-all">
									{typeof sshCommand === "string" && sshCommand !== ""
										? sshCommand
										: "Not available"}
								</p>
								{typeof sshCommand === "string" && sshCommand !== "" && (
									<button
										type="button"
										onClick={() => {
											void navigator.clipboard.writeText(sshCommand);
										}}
										className="p-1 text-fg-muted hover:text-fg hover:bg-secondary-hover rounded transition-colors"
										title="Copy SSH command"
									>
										<svg
											className="w-4 h-4"
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
								)}
							</div>
						</div>
						<div>
							<p className="text-[11px] uppercase tracking-wide text-fg-muted">
								Terraform Cloud
							</p>
							<p className="text-sm text-fg break-all">
								{tfcReady && !infraHasEncryptedValues
									? `${infraCredentials.tfcOrg} / ${workspaceLabel}`
									: "Not connected"}
							</p>
						</div>
					</div>
					{infraCredentials.sshPrivateKey.trim() !== "" && onConnectAgent && (
						<button
							type="button"
							onClick={onConnectAgent}
							className="w-full mt-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Terminal</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							Connect Agent
						</button>
					)}
					{infraCredentials.sshPrivateKey.trim() === "" && (
						<div className="p-2 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200 mt-2">
							Add your SSH private key in the profile to enable the remote
							agent.
						</div>
					)}
				</div>
			)}

			{!shouldShowSkeleton && isEditing && (
				<div className="pt-3 border-t border-border space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs font-medium text-fg-muted">
							Edit Configuration
						</p>
						<button
							type="button"
							onClick={() => {
								setIsEditing(false);
							}}
							className="text-xs text-fg-muted hover:text-fg transition-colors"
						>
							Cancel
						</button>
					</div>
					<div>
						<label
							htmlFor={`edit-ec2-${workspaceValue}`}
							className="block text-[11px] text-fg-subtle mb-1"
						>
							EC2 Instance Type
						</label>
						<GroupedSelect
							id={`edit-ec2-${workspaceValue}`}
							value={editEc2Type}
							onChange={setEditEc2Type}
							groups={EC2_INSTANCE_GROUPS}
							aria-label="EC2 instance type"
						/>
					</div>
					<div className="flex items-center justify-between py-1">
						<span className="text-[11px] text-fg-subtle">Include RDS</span>
						<ToggleSwitch
							checked={editEnableRds}
							onChange={() => {
								setEditEnableRds(!editEnableRds);
							}}
							label="Toggle RDS"
						/>
					</div>
					{editEnableRds && (
						<div>
							<label
								htmlFor={`edit-rds-${workspaceValue}`}
								className="block text-[11px] text-fg-subtle mb-1"
							>
								RDS Instance Class
							</label>
							<GroupedSelect
								id={`edit-rds-${workspaceValue}`}
								value={editRdsClass}
								onChange={setEditRdsClass}
								groups={RDS_INSTANCE_GROUPS}
								aria-label="RDS instance class"
							/>
						</div>
					)}
					<button
						type="button"
						onClick={() => {
							// TODO: Implement save configuration
							setIsEditing(false);
						}}
						className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-md transition-colors"
					>
						Apply Changes
					</button>
				</div>
			)}

			{!shouldShowSkeleton && !isEditing && infraReady && (
				<WorkspaceVariablesPanel
					workspace={workspaceValue}
					accessToken={accessToken}
					tfcToken={infraCredentials.tfcToken}
					tfcOrg={infraCredentials.tfcOrg}
					isExpanded={showVariables}
					onToggle={toggleVariables}
				/>
			)}

			{!shouldShowSkeleton && (
				<div className="pt-3 border-t border-border flex items-center gap-2">
					{!isEditing && infraReady && (
						<button
							type="button"
							onClick={() => {
								setIsEditing(true);
							}}
							disabled={isLoading || isDeleting}
							className="flex-1 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-secondary-hover border border-transparent hover:border-border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							title="Edit configuration"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Edit configuration</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Edit
						</button>
					)}
					<button
						type="button"
						onClick={onDelete}
						disabled={isLoading || isDeleting || enableEc2}
						className={`${!isEditing && infraReady ? "flex-1" : "w-full"} px-3 py-2 text-sm text-fg-muted hover:text-red-400 hover:bg-red-900/10 border border-transparent hover:border-red-700/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
						title={enableEc2 ? "Stop EC2 before deleting" : "Delete workspace"}
					>
						{isDeleting ? (
							<>
								<svg
									className="w-4 h-4 animate-spin"
									fill="none"
									viewBox="0 0 24 24"
								>
									<title>Deleting</title>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								Deleting...
							</>
						) : (
							<>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Delete workspace</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
								Delete
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
}

export default function InfraPanel({ onConnectAgent }: IInfraPanelProps) {
	const { user, accessToken } = useUser();
	const { decryptedMetadata, isLoading: isMetadataLoading } =
		useDecryptedUserMetadata();
	const { openUserProfile } = useUserProfileStore();
	const queryClient = useQueryClient();
	const [newWorkspace, setNewWorkspace] = useState<string>("");
	const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
		WORKSPACE_MODES.API,
	);
	const [ec2InstanceType, setEc2InstanceType] = useState<string>(
		DEFAULT_EC2_INSTANCE_TYPE,
	);
	const [rdsInstanceClass, setRdsInstanceClass] = useState<string>(
		DEFAULT_RDS_INSTANCE_TYPE,
	);
	const [enableRds, setEnableRds] = useState<boolean>(false);
	const [githubOrg, setGithubOrg] = useState<string>("");
	const [useGithubUsername, setUseGithubUsername] = useState<boolean>(true);
	const [workspaceError, setWorkspaceError] = useState<string | null>(null);
	const [isWorkspaceSaving, setIsWorkspaceSaving] = useState<boolean>(false);
	const [deletingWorkspace, setDeletingWorkspace] = useState<string | null>(
		null,
	);
	const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(
		null,
	);

	const infraCredentials = useMemo(
		() => parseInfraCredentials(decryptedMetadata),
		[decryptedMetadata],
	);

	const infraHasEncryptedValues = useMemo(() => {
		return hasEncryptedInfraValues(decryptedMetadata);
	}, [decryptedMetadata]);

	const isMetadataPending = isMetadataLoading || decryptedMetadata === null;

	const tfcCredentialsReady =
		!infraHasEncryptedValues &&
		infraCredentials.tfcToken.trim() !== "" &&
		infraCredentials.tfcOrg.trim() !== "";

	const workspacesQuery = useQuery({
		queryKey: [
			"terraform-workspaces",
			infraCredentials.tfcToken,
			infraCredentials.tfcOrg,
		],
		enabled:
			!isMetadataPending &&
			tfcCredentialsReady &&
			accessToken !== null &&
			accessToken !== "",
		staleTime: 60_000,
		queryFn: async () => {
			if (accessToken === null || accessToken === "") {
				throw new Error("Missing access token");
			}
			const response = await fetch(`${getApiUrl()}/terraform/workspaces`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tfcToken: infraCredentials.tfcToken,
					tfcOrg: infraCredentials.tfcOrg,
				}),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch workspaces");
			}
			return (await response.json()) as IWorkspacesResponse;
		},
	});

	const workspaceList = useMemo(() => {
		return workspacesQuery.data?.workspaces.map((ws) => ws.name) ?? [];
	}, [workspacesQuery.data]);

	const githubUsername = useMemo(() => {
		if (user !== null) {
			if (
				typeof user.nickname === "string" &&
				user.nickname !== "" &&
				user.nickname !== user.email
			) {
				return user.nickname;
			}
		}
		return null;
	}, [user]);

	const awsReady = useMemo(() => {
		return (
			infraCredentials.sshPublicKey.trim() !== "" &&
			infraCredentials.awsAccessKeyId.trim() !== "" &&
			infraCredentials.awsSecretAccessKey.trim() !== ""
		);
	}, [infraCredentials]);

	const tfcReady = useMemo(() => {
		return tfcCredentialsReady && workspaceList.length > 0;
	}, [tfcCredentialsReady, workspaceList]);

	const infraReady = useMemo(() => {
		return awsReady && tfcReady && !infraHasEncryptedValues;
	}, [awsReady, tfcReady, infraHasEncryptedValues]);

	const visibleWorkspaces = workspaceList;
	const showInitialSkeleton =
		isMetadataPending || (tfcCredentialsReady && workspacesQuery.isLoading);
	const canAddWorkspace =
		!isWorkspaceSaving &&
		tfcCredentialsReady &&
		accessToken !== null &&
		accessToken !== "";

	const handleAddWorkspace = async () => {
		setWorkspaceError(null);
		const trimmed = newWorkspace.trim();
		if (trimmed === "") {
			setWorkspaceError("Enter a workspace name to continue.");
			return;
		}
		if (!canAddWorkspace) {
			setWorkspaceError("Add your Terraform Cloud credentials first.");
			return;
		}
		if (workspaceList.includes(trimmed)) {
			setWorkspaceError("That workspace already exists.");
			return;
		}
		if (workspaceMode === WORKSPACE_MODES.VCS) {
			if (useGithubUsername) {
				if (githubUsername === null) {
					setWorkspaceError(
						"Could not determine your GitHub username. Please log in with GitHub.",
					);
					return;
				}
			} else if (githubOrg.trim() === "") {
				setWorkspaceError("Enter a GitHub organization for VCS mode.");
				return;
			}
		}

		setIsWorkspaceSaving(true);

		try {
			const createResponse = await fetch(`${getApiUrl()}/terraform/workspace`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tfcToken: infraCredentials.tfcToken,
					tfcOrg: infraCredentials.tfcOrg,
					workspaceName: trimmed,
					mode: workspaceMode,
					ec2InstanceType:
						workspaceMode === WORKSPACE_MODES.API ? ec2InstanceType : undefined,
					rdsInstanceClass:
						workspaceMode === WORKSPACE_MODES.API && enableRds
							? rdsInstanceClass
							: undefined,
					githubOrg:
						workspaceMode === WORKSPACE_MODES.VCS
							? useGithubUsername
								? githubUsername
								: githubOrg.trim()
							: undefined,
				}),
			});

			if (!createResponse.ok) {
				let message = "Failed to create workspace in Terraform Cloud.";
				try {
					const errorBody: unknown = await createResponse.json();
					if (
						errorBody !== null &&
						typeof errorBody === "object" &&
						"message" in errorBody &&
						typeof (errorBody as Record<string, unknown>).message === "string"
					) {
						message = (errorBody as Record<string, string>).message;
					}
				} catch {
					message = "Failed to create workspace in Terraform Cloud.";
				}
				throw new Error(message);
			}

			await queryClient.invalidateQueries({
				queryKey: [
					"terraform-workspaces",
					infraCredentials.tfcToken,
					infraCredentials.tfcOrg,
				],
			});
			setNewWorkspace("");
			setWorkspaceMode(WORKSPACE_MODES.API);
			setEc2InstanceType(DEFAULT_EC2_INSTANCE_TYPE);
			setRdsInstanceClass(DEFAULT_RDS_INSTANCE_TYPE);
			setEnableRds(false);
			setGithubOrg("");
			setUseGithubUsername(true);
		} catch (error: unknown) {
			if (error instanceof Error) {
				setWorkspaceError(error.message);
			} else {
				setWorkspaceError("Failed to create workspace.");
			}
		} finally {
			setIsWorkspaceSaving(false);
		}
	};

	const handleDeleteWorkspace = async (workspaceName: string) => {
		if (!accessToken || !tfcCredentialsReady) {
			setWorkspaceError("Unable to delete workspace. Check your credentials.");
			return;
		}

		setDeletingWorkspace(workspaceName);
		setWorkspaceError(null);

		try {
			const deleteResponse = await fetch(
				`${getApiUrl()}/terraform/workspace/${encodeURIComponent(workspaceName)}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						tfcToken: infraCredentials.tfcToken,
						tfcOrg: infraCredentials.tfcOrg,
					}),
				},
			);

			if (!deleteResponse.ok) {
				let message = "Failed to delete workspace from Terraform Cloud.";
				try {
					const errorBody: unknown = await deleteResponse.json();
					if (
						errorBody !== null &&
						typeof errorBody === "object" &&
						"message" in errorBody &&
						typeof (errorBody as Record<string, unknown>).message === "string"
					) {
						message = (errorBody as Record<string, string>).message;
					}
				} catch {
					message = "Failed to delete workspace from Terraform Cloud.";
				}
				throw new Error(message);
			}

			await queryClient.invalidateQueries({
				queryKey: [
					"terraform-workspaces",
					infraCredentials.tfcToken,
					infraCredentials.tfcOrg,
				],
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				setWorkspaceError(error.message);
			} else {
				setWorkspaceError("Failed to delete workspace.");
			}
		} finally {
			setDeletingWorkspace(null);
			setWorkspaceToDelete(null);
		}
	};

	const handleConfirmDelete = () => {
		if (workspaceToDelete !== null) {
			void handleDeleteWorkspace(workspaceToDelete);
		}
	};

	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin [scrollbar-gutter:stable_both-edges]">
			<div className="max-w-5xl mx-auto px-3 pt-6 pb-6 md:px-6 md:pt-8 md:pb-8 space-y-6">
				<div className="flex items-center justify-between gap-4">
					<div>
						<h2 className="text-xl md:text-2xl font-semibold text-fg">
							Infrastructure Control
						</h2>
						<p className="text-sm text-fg-subtle mt-1">
							Toggle EC2 provisioning via Terraform Cloud.
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							openUserProfile("infra");
						}}
						className="px-3 py-2 bg-secondary-hover hover:bg-secondary-active text-fg-muted rounded-md text-sm transition-colors"
					>
						Manage Credentials
					</button>
				</div>

				<div className="space-y-4">
					{showInitialSkeleton && (
						<div className="p-4 bg-bg-muted border border-border rounded-lg space-y-4 animate-pulse">
							<div className="flex items-start justify-between gap-4">
								<div className="space-y-2">
									<div className="h-3 w-28 bg-border rounded" />
									<div className="h-5 w-40 bg-border rounded" />
								</div>
								<div className="h-6 w-12 bg-border rounded-full" />
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="p-3 bg-secondary border border-border rounded-md">
									<div className="h-3 w-16 bg-border rounded" />
									<div className="h-4 w-20 bg-border rounded mt-2" />
								</div>
								<div className="p-3 bg-secondary border border-border rounded-md">
									<div className="h-3 w-20 bg-border rounded" />
									<div className="h-4 w-32 bg-border rounded mt-2" />
								</div>
							</div>
						</div>
					)}

					{!showInitialSkeleton &&
						visibleWorkspaces.map((workspace) => (
							<InfraWorkspaceCard
								key={workspace.trim() !== "" ? workspace : "workspace-new"}
								workspace={workspace}
								accessToken={accessToken}
								infraCredentials={infraCredentials}
								infraReady={infraReady}
								awsReady={awsReady}
								tfcReady={tfcReady}
								infraHasEncryptedValues={infraHasEncryptedValues}
								isMetadataLoading={isMetadataPending}
								isDeleting={deletingWorkspace === workspace}
								onConnectAgent={onConnectAgent}
								onOpenProfile={() => {
									openUserProfile("infra");
								}}
								onDelete={() => {
									setWorkspaceToDelete(workspace);
								}}
							/>
						))}

					{!showInitialSkeleton && visibleWorkspaces.length === 0 && (
						<div className="px-4 py-3 bg-secondary border border-border rounded-lg text-sm text-fg-muted">
							No workspaces added yet.
						</div>
					)}

					<div className="p-4 bg-secondary border border-border rounded-lg space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-fg">Add workspace</p>
							<button
								type="button"
								onClick={() => {
									openUserProfile("infra");
								}}
								className="text-xs text-fg-muted hover:text-fg transition-colors"
							>
								Manage credentials
							</button>
						</div>

						<div className="space-y-3">
							<div>
								<label
									htmlFor="workspace-name"
									className="block text-xs font-medium text-fg-muted mb-1.5"
								>
									Workspace name
								</label>
								<input
									id="workspace-name"
									type="text"
									value={newWorkspace}
									onChange={(event) => {
										setNewWorkspace(event.target.value);
										setWorkspaceError(null);
									}}
									placeholder="my-workspace"
									className="w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
									disabled={!canAddWorkspace}
								/>
							</div>

							<div>
								<label
									htmlFor="workspace-mode"
									className="block text-xs font-medium text-fg-muted mb-1.5"
								>
									Mode
								</label>
								<SimpleSelect
									id="workspace-mode"
									value={workspaceMode}
									onChange={(value) => {
										setWorkspaceMode(value as WorkspaceMode);
									}}
									options={WORKSPACE_MODE_OPTIONS}
									disabled={!canAddWorkspace}
									aria-label="Workspace mode"
								/>
							</div>

							{workspaceMode === WORKSPACE_MODES.API && (
								<>
									<div>
										<label
											htmlFor="ec2-instance-type"
											className="block text-xs font-medium text-fg-muted mb-1.5"
										>
											EC2 Instance Type
										</label>
										<GroupedSelect
											id="ec2-instance-type"
											value={ec2InstanceType}
											onChange={setEc2InstanceType}
											groups={EC2_INSTANCE_GROUPS}
											disabled={!canAddWorkspace}
											aria-label="EC2 instance type"
										/>
									</div>

									<div className="flex items-center justify-between py-2">
										<div>
											<p className="text-xs font-medium text-fg-muted">
												Include RDS Database
											</p>
											<p className="text-[11px] text-fg-subtle mt-0.5">
												Add a managed PostgreSQL database
											</p>
										</div>
										<ToggleSwitch
											checked={enableRds}
											onChange={() => {
												setEnableRds(!enableRds);
											}}
											disabled={!canAddWorkspace}
											label="Toggle RDS"
										/>
									</div>

									{enableRds && (
										<div>
											<label
												htmlFor="rds-instance-class"
												className="block text-xs font-medium text-fg-muted mb-1.5"
											>
												RDS Instance Class
											</label>
											<GroupedSelect
												id="rds-instance-class"
												value={rdsInstanceClass}
												onChange={setRdsInstanceClass}
												groups={RDS_INSTANCE_GROUPS}
												disabled={!canAddWorkspace}
												aria-label="RDS instance class"
											/>
										</div>
									)}
								</>
							)}

							{workspaceMode === WORKSPACE_MODES.VCS && (
								<>
									<div className="flex items-center justify-between py-2">
										<div>
											<p className="text-xs font-medium text-fg-muted">
												Use personal GitHub account
											</p>
											<p className="text-[11px] text-fg-subtle mt-0.5">
												{useGithubUsername
													? "Repository owned by your username"
													: "Repository owned by an organization"}
											</p>
										</div>
										<ToggleSwitch
											checked={useGithubUsername}
											onChange={() => {
												setUseGithubUsername(!useGithubUsername);
												setWorkspaceError(null);
											}}
											disabled={!canAddWorkspace}
											label="Toggle personal account"
										/>
									</div>
									{useGithubUsername ? (
										<div className="p-3 bg-bg-muted border border-border rounded-md">
											<p className="text-[11px] text-fg-subtle">
												The workspace will be linked to{" "}
												<span className="font-mono text-fg-muted">
													{githubUsername ?? "your-username"}/
													{newWorkspace.trim() || "repo"}
												</span>
											</p>
											{githubUsername === null && (
												<p className="text-[11px] text-amber-400 mt-1">
													Could not detect GitHub username from your account.
												</p>
											)}
										</div>
									) : (
										<div>
											<label
												htmlFor="github-org"
												className="block text-xs font-medium text-fg-muted mb-1.5"
											>
												Organization
											</label>
											<input
												id="github-org"
												type="text"
												value={githubOrg}
												onChange={(event) => {
													setGithubOrg(event.target.value);
													setWorkspaceError(null);
												}}
												placeholder="org-name"
												className="w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
												disabled={!canAddWorkspace}
											/>
											<p className="text-[11px] text-fg-subtle mt-1">
												The workspace will be linked to{" "}
												<span className="font-mono text-fg-muted">
													{githubOrg.trim() || "org"}/
													{newWorkspace.trim() || "repo"}
												</span>
											</p>
										</div>
									)}
									<div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-md text-xs text-blue-200">
										<p className="font-medium mb-1">VCS-connected workspace</p>
										<p>
											Ensure you have connected GitHub to Terraform Cloud in
											your organization settings and the repository exists.
										</p>
									</div>
								</>
							)}
						</div>

						<div className="flex flex-col gap-2 pt-2 border-t border-border md:flex-row">
							<button
								type="button"
								onClick={() => {
									void handleAddWorkspace();
								}}
								disabled={!canAddWorkspace}
								className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isWorkspaceSaving ? "Creating..." : "Create Workspace"}
							</button>
						</div>

						{workspaceError && (
							<p className="text-xs text-red-200">{workspaceError}</p>
						)}

						<p className="text-xs text-fg-muted">
							Workspaces use your global Terraform Cloud organization.
						</p>
					</div>
				</div>
			</div>

			<CustomModal
				isOpen={workspaceToDelete !== null}
				title="Delete Workspace"
				onClose={() => {
					if (deletingWorkspace === null) {
						setWorkspaceToDelete(null);
					}
				}}
				size="small"
				footer={
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => {
								setWorkspaceToDelete(null);
							}}
							disabled={deletingWorkspace !== null}
							className="flex-1 px-4 py-2 bg-secondary-hover hover:bg-secondary-active text-fg rounded-md text-sm font-medium transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleConfirmDelete}
							disabled={deletingWorkspace !== null}
							className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{deletingWorkspace !== null ? (
								<>
									<svg
										className="w-4 h-4 animate-spin"
										fill="none"
										viewBox="0 0 24 24"
									>
										<title>Deleting</title>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</button>
					</div>
				}
			>
				<div className="flex items-start gap-3">
					<div className="p-2 bg-red-900/30 rounded-full flex-shrink-0">
						<svg
							className="w-5 h-5 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Warning</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<p className="text-sm">
						Are you sure you want to delete{" "}
						<span className="font-medium text-fg">{workspaceToDelete}</span>?
						This will permanently remove the workspace from Terraform Cloud.
					</p>
				</div>
			</CustomModal>
		</div>
	);
}
