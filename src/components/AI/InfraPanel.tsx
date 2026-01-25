import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useUserStore } from "@/useUserStore.ts";
import { hasEncryptedInfraValues } from "@/utils/decryptUserMetadata.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import {
	normalizeWorkspaceList,
	parseWorkspaceValue,
} from "@/utils/infraWorkspaces.ts";
import { getPassphraseFromSession } from "@/utils/passphraseSession.ts";
import { isRecord } from "@/utils/typeGuards.ts";
import { encryptSecret } from "@/utils/zeroKnowledgeEncryption.ts";

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
	tfcWorkspace: string;
	tfcWorkspaces: string[];
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
			tfcWorkspace:
				typeof metadata.infra.tfcWorkspace === "string"
					? metadata.infra.tfcWorkspace
					: "",
			tfcWorkspaces: parseWorkspaceValue(metadata.infra.tfcWorkspaces),
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
		tfcWorkspace: "",
		tfcWorkspaces: [],
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
	onConnectAgent?: () => void;
	onOpenProfile: () => void;
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
	onConnectAgent,
	onOpenProfile,
}: IInfraWorkspaceCardProps) {
	const [enableEc2, setEnableEc2] = useState<boolean>(false);
	const [runStatus, setRunStatus] = useState<string | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [outputs, setOutputs] = useState<Record<string, unknown>>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const previousValueRef = useRef<boolean>(false);

	const workspaceValue = workspace.trim();
	const workspaceLabel = workspaceValue !== "" ? workspaceValue : "Workspace";

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
					disabled={isLoading || !infraReady || shouldShowSkeleton}
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

			{shouldShowSkeleton ? (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="p-3 bg-secondary border border-border rounded-md animate-pulse">
						<div className="h-3 w-16 bg-border rounded" />
						<div className="h-4 w-20 bg-border rounded mt-2" />
					</div>
					<div className="p-3 bg-secondary border border-border rounded-md animate-pulse">
						<div className="h-3 w-20 bg-border rounded" />
						<div className="h-4 w-32 bg-border rounded mt-2" />
					</div>
				</div>
			) : (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="p-3 bg-secondary border border-border rounded-md">
						<p className="text-xs text-fg-subtle">Run Status</p>
						<p className="text-sm text-fg mt-1">{runStatus ?? "Idle"}</p>
					</div>
					<div className="p-3 bg-secondary border border-border rounded-md">
						<p className="text-xs text-fg-subtle">Latest Output</p>
						<p className="text-sm text-fg mt-1 truncate">
							{hasPublicIp ? publicIp : "No public IP yet"}
						</p>
					</div>
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
							<p className="text-sm text-fg break-all">{publicIp}</p>
						</div>
						<div>
							<p className="text-[11px] uppercase tracking-wide text-fg-muted">
								SSH Command
							</p>
							<p className="text-sm text-fg break-all">
								{typeof sshCommand === "string" && sshCommand !== ""
									? sshCommand
									: "Not available"}
							</p>
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
		</div>
	);
}

export default function InfraPanel({ onConnectAgent }: IInfraPanelProps) {
	const { accessToken, user, userMetadata } = useUser();
	const { decryptedMetadata, isLoading: isMetadataLoading } =
		useDecryptedUserMetadata();
	const { openUserProfile } = useUserProfileStore();
	const { setUserMetadata: setUserMetadataStore } = useUserStore();
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
	const [workspaceError, setWorkspaceError] = useState<string | null>(null);
	const [isWorkspaceSaving, setIsWorkspaceSaving] = useState<boolean>(false);

	const infraCredentials = useMemo(
		() => parseInfraCredentials(decryptedMetadata),
		[decryptedMetadata],
	);

	const infraHasEncryptedValues = useMemo(() => {
		return hasEncryptedInfraValues(decryptedMetadata);
	}, [decryptedMetadata]);

	const isMetadataPending = isMetadataLoading || decryptedMetadata === null;

	const workspaceList = useMemo(() => {
		if (infraHasEncryptedValues) {
			return [];
		}
		const list =
			infraCredentials.tfcWorkspaces.length > 0
				? infraCredentials.tfcWorkspaces
				: infraCredentials.tfcWorkspace.trim() !== ""
					? [infraCredentials.tfcWorkspace]
					: [];
		return normalizeWorkspaceList(list);
	}, [infraCredentials, infraHasEncryptedValues]);

	const awsReady = useMemo(() => {
		return (
			infraCredentials.sshPublicKey.trim() !== "" &&
			infraCredentials.awsAccessKeyId.trim() !== "" &&
			infraCredentials.awsSecretAccessKey.trim() !== ""
		);
	}, [infraCredentials]);

	const tfcReady = useMemo(() => {
		return (
			infraCredentials.tfcToken.trim() !== "" &&
			infraCredentials.tfcOrg.trim() !== "" &&
			workspaceList.length > 0
		);
	}, [infraCredentials, workspaceList]);

	const infraReady = useMemo(() => {
		return awsReady && tfcReady && !infraHasEncryptedValues;
	}, [awsReady, tfcReady, infraHasEncryptedValues]);

	const visibleWorkspaces = workspaceList;
	const showInitialSkeleton = isMetadataPending;
	const canAddWorkspace =
		!isWorkspaceSaving &&
		!infraHasEncryptedValues &&
		accessToken !== null &&
		accessToken !== "" &&
		user?.sub !== undefined &&
		user.sub !== "";

	const handleAddWorkspace = async () => {
		setWorkspaceError(null);
		const trimmed = newWorkspace.trim();
		if (trimmed === "") {
			setWorkspaceError("Enter a workspace name to continue.");
			return;
		}
		if (!canAddWorkspace || user?.sub === undefined) {
			setWorkspaceError("Unlock your credentials before adding a workspace.");
			return;
		}
		if (infraCredentials.tfcToken.trim() === "") {
			setWorkspaceError("Add your Terraform Cloud token first.");
			return;
		}
		if (infraCredentials.tfcOrg.trim() === "") {
			setWorkspaceError("Add your Terraform Cloud organization first.");
			return;
		}
		if (
			infraCredentials.sshPublicKey.trim() === "" ||
			infraCredentials.awsAccessKeyId.trim() === "" ||
			infraCredentials.awsSecretAccessKey.trim() === ""
		) {
			setWorkspaceError("Add your AWS credentials and SSH public key first.");
			return;
		}
		const existingWorkspaces = normalizeWorkspaceList(
			infraCredentials.tfcWorkspaces,
		);
		if (existingWorkspaces.includes(trimmed)) {
			setWorkspaceError("That workspace already exists.");
			return;
		}
		const passphrase = getPassphraseFromSession(user.sub);
		if (passphrase === null) {
			setWorkspaceError("Unlock your credentials before adding a workspace.");
			return;
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

			const nextWorkspaces = normalizeWorkspaceList([
				...existingWorkspaces,
				trimmed,
			]);
			const primaryWorkspace = nextWorkspaces[0] ?? trimmed;

			const encryptedEntries = {
				sshPublicKey: JSON.stringify(
					await encryptSecret(
						infraCredentials.sshPublicKey.trim(),
						user.sub,
						passphrase,
					),
				),
				sshPrivateKey:
					infraCredentials.sshPrivateKey.trim() === ""
						? ""
						: JSON.stringify(
								await encryptSecret(
									infraCredentials.sshPrivateKey.trim(),
									user.sub,
									passphrase,
								),
							),
				awsAccessKeyId: JSON.stringify(
					await encryptSecret(
						infraCredentials.awsAccessKeyId.trim(),
						user.sub,
						passphrase,
					),
				),
				awsSecretAccessKey: JSON.stringify(
					await encryptSecret(
						infraCredentials.awsSecretAccessKey.trim(),
						user.sub,
						passphrase,
					),
				),
				awsSessionToken:
					infraCredentials.awsSessionToken.trim() === ""
						? ""
						: JSON.stringify(
								await encryptSecret(
									infraCredentials.awsSessionToken.trim(),
									user.sub,
									passphrase,
								),
							),
				tfcToken: JSON.stringify(
					await encryptSecret(
						infraCredentials.tfcToken.trim(),
						user.sub,
						passphrase,
					),
				),
				tfcOrg: JSON.stringify(
					await encryptSecret(
						infraCredentials.tfcOrg.trim(),
						user.sub,
						passphrase,
					),
				),
				tfcWorkspace: JSON.stringify(
					await encryptSecret(primaryWorkspace, user.sub, passphrase),
				),
				tfcWorkspaces: JSON.stringify(
					await encryptSecret(
						JSON.stringify(nextWorkspaces),
						user.sub,
						passphrase,
					),
				),
			};

			const response = await fetch(`${getApiUrl()}/user-metadata/infra`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ infra: encryptedEntries }),
			});
			if (!response.ok) {
				let message = "Failed to save workspace.";
				try {
					const errorBody: unknown = await response.json();
					if (
						errorBody !== null &&
						typeof errorBody === "object" &&
						"message" in errorBody &&
						typeof (errorBody as Record<string, unknown>).message === "string"
					) {
						message = (errorBody as Record<string, string>).message;
					}
				} catch {
					message = "Failed to save workspace.";
				}
				throw new Error(message);
			}
			const result = (await response.json()) as Record<string, unknown>;
			const infraRecord =
				isRecord(result) && isRecord(result.infra) ? result.infra : null;
			if (infraRecord === null) {
				throw new Error("Invalid response from server.");
			}
			const updatedMetadata = userMetadata
				? { ...userMetadata, infra: infraRecord }
				: { infra: infraRecord };
			setUserMetadataStore(updatedMetadata);
			await queryClient.invalidateQueries({
				queryKey: ["userMetadata", user.sub],
			});
			setNewWorkspace("");
			setWorkspaceMode(WORKSPACE_MODES.API);
			setEc2InstanceType(DEFAULT_EC2_INSTANCE_TYPE);
			setRdsInstanceClass(DEFAULT_RDS_INSTANCE_TYPE);
			setEnableRds(false);
		} catch (error: unknown) {
			if (error instanceof Error) {
				setWorkspaceError(error.message);
			} else {
				setWorkspaceError("Failed to save workspace.");
			}
		} finally {
			setIsWorkspaceSaving(false);
		}
	};

	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin">
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
								onConnectAgent={onConnectAgent}
								onOpenProfile={() => {
									openUserProfile("infra");
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
								<div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-md text-xs text-blue-200">
									<p className="font-medium mb-1">VCS-connected workspace</p>
									<p>
										After creating the workspace, connect it to your GitHub
										repository in Terraform Cloud.
									</p>
								</div>
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
		</div>
	);
}
