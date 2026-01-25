import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToggleSwitch from "@/components/UI/ToggleSwitch.tsx";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserProfileStore } from "@/useUserProfileStore.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import { isRecord } from "@/utils/typeGuards.ts";
import { parseEncryptedValue } from "@/utils/zeroKnowledgeEncryption.ts";

interface IInfraCredentials {
	sshPublicKey: string;
	sshPrivateKey: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsSessionToken: string;
	tfcToken: string;
	tfcOrg: string;
	tfcWorkspace: string;
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
	};
};

export type { IInfraCredentials };

interface IInfraPanelProps {
	onConnectAgent?: () => void;
}

export default function InfraPanel({ onConnectAgent }: IInfraPanelProps) {
	const { accessToken } = useUser();
	const { decryptedMetadata } = useDecryptedUserMetadata();
	const { openUserProfile } = useUserProfileStore();
	const [enableEc2, setEnableEc2] = useState<boolean>(false);
	const [runStatus, setRunStatus] = useState<string | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [outputs, setOutputs] = useState<Record<string, unknown>>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const infraCredentials = useMemo(
		() => parseInfraCredentials(decryptedMetadata),
		[decryptedMetadata],
	);

	const infraHasEncryptedValues = useMemo(() => {
		return [
			infraCredentials.sshPublicKey,
			infraCredentials.awsAccessKeyId,
			infraCredentials.awsSecretAccessKey,
			infraCredentials.awsSessionToken,
			infraCredentials.tfcToken,
			infraCredentials.tfcOrg,
			infraCredentials.tfcWorkspace,
		].some((value) => {
			if (value.trim() === "") {
				return false;
			}
			return parseEncryptedValue(value) !== null;
		});
	}, [infraCredentials]);

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
			infraCredentials.tfcWorkspace.trim() !== ""
		);
	}, [infraCredentials]);

	const infraReady = useMemo(() => {
		return awsReady && tfcReady && !infraHasEncryptedValues;
	}, [awsReady, tfcReady, infraHasEncryptedValues]);

	const fetchStatus = useCallback(async () => {
		if (accessToken === null || accessToken === "") {
			return;
		}
		if (!infraReady) {
			return;
		}
		try {
			const response = await fetch(`${getApiUrl()}/terraform/status`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tfcToken: infraCredentials.tfcToken,
					tfcOrg: infraCredentials.tfcOrg,
					tfcWorkspace: infraCredentials.tfcWorkspace,
				}),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch Terraform status");
			}
			const result = (await response.json()) as ITerraformStatusResponse & {
				success?: boolean;
			};
			setEnableEc2(Boolean(result.enableEc2));
			setOutputs(result.outputs ?? {});
		} catch (fetchError: unknown) {
			if (fetchError instanceof Error) {
				setError(fetchError.message);
			}
		}
	}, [
		accessToken,
		infraReady,
		infraCredentials.tfcToken,
		infraCredentials.tfcOrg,
		infraCredentials.tfcWorkspace,
	]);

	useEffect(() => {
		void fetchStatus();
	}, [fetchStatus]);

	useEffect(() => {
		if (!runId || accessToken === null || accessToken === "") {
			return;
		}
		if (!infraReady) {
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
						tfcWorkspace: infraCredentials.tfcWorkspace,
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
				await fetchStatus();
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
		fetchStatus,
		infraReady,
		infraCredentials.tfcToken,
		infraCredentials.tfcOrg,
		infraCredentials.tfcWorkspace,
	]);

	const previousValueRef = useRef<boolean>(false);

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
					tfcWorkspace: infraCredentials.tfcWorkspace,
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
		toggleMutation.mutate(!enableEc2);
	};

	const publicIp = outputs.dev_ip;
	const sshCommand = outputs.ssh_command;
	const hasPublicIp = typeof publicIp === "string" && publicIp !== "";
	const showConnectionDetails = enableEc2 && hasPublicIp;
	const workspaceName = useMemo(() => {
		if (tfcReady && !infraHasEncryptedValues) {
			const name = infraCredentials.tfcWorkspace.trim();
			if (name !== "") {
				return name;
			}
		}
		return "Workspace";
	}, [tfcReady, infraHasEncryptedValues, infraCredentials.tfcWorkspace]);

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
					<div className="p-4 bg-bg-muted border border-border rounded-lg space-y-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-xs uppercase tracking-wide text-fg-muted">
									Terraform Workspace
								</p>
								<p className="text-lg font-semibold text-fg">{workspaceName}</p>
								<p className="text-xs text-fg-subtle mt-1">
									{enableEc2 ? "Provisioned" : "Stopped"}
								</p>
							</div>
							<ToggleSwitch
								checked={enableEc2}
								onChange={handleToggle}
								disabled={isLoading || !infraReady}
								label="Toggle EC2 instance"
							/>
						</div>

						{!infraReady && !tfcReady && (
							<div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-md text-xs text-blue-200 space-y-2">
								<p className="font-medium">Connect Terraform Cloud</p>
								<p>
									Add your Terraform Cloud API token, organization, and
									workspace in the profile panel to enable infrastructure
									control.
								</p>
								<button
									type="button"
									onClick={() => {
										openUserProfile("infra");
									}}
									className="mt-1 px-3 py-1.5 bg-blue-700/40 hover:bg-blue-700/60 text-blue-100 rounded text-xs transition-colors"
								>
									Open Profile
								</button>
							</div>
						)}

						{!infraReady && tfcReady && !awsReady && (
							<div className="p-3 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200">
								Add your SSH public key and AWS credentials in the profile panel
								to enable toggling.
							</div>
						)}

						{!infraReady && infraHasEncryptedValues && (
							<div className="p-3 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200">
								Unlock your credentials with your passphrase to enable toggling.
							</div>
						)}

						{error !== null && error !== "" && (
							<div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-xs text-red-200">
								{error}
							</div>
						)}

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

						{showConnectionDetails && (
							<div className="pt-2 border-t border-border space-y-3">
								<p className="text-sm font-medium text-fg">
									Connection Details
								</p>
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
												? `${infraCredentials.tfcOrg} / ${infraCredentials.tfcWorkspace}`
												: "Not connected"}
										</p>
									</div>
								</div>
								{infraCredentials.sshPrivateKey.trim() !== "" &&
									onConnectAgent && (
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

					<button
						type="button"
						onClick={() => {
							openUserProfile("infra");
						}}
						className="w-full px-4 py-3 border border-dashed border-border/70 rounded-lg text-sm text-fg-muted hover:text-fg hover:border-border transition-colors"
					>
						+ Add Workspace
					</button>
				</div>
			</div>
		</div>
	);
}
