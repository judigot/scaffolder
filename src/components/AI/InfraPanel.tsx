import { useCallback, useEffect, useMemo, useState } from "react";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserProfileStore } from "@/useUserProfileStore.ts";
import { getApiUrl } from "@/utils/getApiUrl.ts";
import { isRecord } from "@/utils/typeGuards.ts";
import { parseEncryptedValue } from "@/utils/zeroKnowledgeEncryption.ts";

interface IInfraCredentials {
	sshPublicKey: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
	awsSessionToken: string;
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
		};
	}
	return {
		sshPublicKey: "",
		awsAccessKeyId: "",
		awsSecretAccessKey: "",
		awsSessionToken: "",
	};
};

export default function InfraPanel() {
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
		].some((value) => {
			if (value.trim() === "") {
				return false;
			}
			return parseEncryptedValue(value) !== null;
		});
	}, [infraCredentials]);

	const infraReady = useMemo(() => {
		return (
			infraCredentials.sshPublicKey.trim() !== "" &&
			infraCredentials.awsAccessKeyId.trim() !== "" &&
			infraCredentials.awsSecretAccessKey.trim() !== "" &&
			!infraHasEncryptedValues
		);
	}, [infraCredentials, infraHasEncryptedValues]);

	const fetchStatus = useCallback(async () => {
		if (accessToken === null || accessToken === "") {
			return;
		}
		try {
			const response = await fetch(`${getApiUrl()}/terraform/status`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
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
	}, [accessToken]);

	useEffect(() => {
		void fetchStatus();
	}, [fetchStatus]);

	useEffect(() => {
		if (!runId || accessToken === null || accessToken === "") {
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
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
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
	}, [runId, accessToken, fetchStatus]);

	const handleToggle = async () => {
		if (accessToken === null || accessToken === "") {
			return;
		}
		if (!infraReady) {
			setError("Add and unlock your infrastructure credentials first.");
			return;
		}
		setIsLoading(true);
		setError(null);
		const nextValue = !enableEc2;
		try {
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
				}),
			});
			if (!response.ok) {
				throw new Error("Failed to trigger Terraform run");
			}
			const result = (await response.json()) as ITerraformRunResponse & {
				success?: boolean;
			};
			setEnableEc2(nextValue);
			setRunId(result.run.id);
			setRunStatus(result.run.status);
		} catch (toggleError: unknown) {
			setIsLoading(false);
			if (toggleError instanceof Error) {
				setError(toggleError.message);
			} else {
				setError("Failed to trigger Terraform run");
			}
		}
	};

	const publicIp = outputs.dev_ip;
	const sshCommand = outputs.ssh_command;

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

				<div className="grid gap-4 md:grid-cols-[2fr,1fr]">
					<div className="p-4 bg-bg-muted border border-border rounded-lg space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-fg">EC2 Instance</p>
								<p className="text-xs text-fg-subtle">
									{enableEc2 ? "Provisioned" : "Stopped"}
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={enableEc2}
								aria-label="Toggle EC2 instance"
								onClick={handleToggle}
								disabled={isLoading || !infraReady}
								className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
									enableEc2 ? "bg-success-500" : "bg-secondary-hover"
								} ${
									isLoading || !infraReady
										? "opacity-50 cursor-not-allowed"
										: ""
								}`}
							>
								<span
									className={`inline-block h-5 w-5 transform rounded-full bg-bg transition-transform ${
										enableEc2 ? "translate-x-6" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{!infraReady && (
							<div className="p-3 bg-warning-900/20 border border-warning-700/40 rounded-md text-xs text-warning-200">
								Add your SSH public key and AWS credentials in the profile panel
								to enable toggling.
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
									{typeof publicIp === "string" && publicIp !== ""
										? publicIp
										: "No public IP yet"}
								</p>
							</div>
						</div>
					</div>

					<div className="p-4 bg-bg-muted border border-border rounded-lg space-y-3">
						<p className="text-sm font-medium text-fg">Connection Details</p>
						<div className="text-xs text-fg-subtle space-y-2">
							<div>
								<p className="text-[11px] uppercase tracking-wide text-fg-muted">
									Public IP
								</p>
								<p className="text-sm text-fg break-all">
									{typeof publicIp === "string" && publicIp !== ""
										? publicIp
										: "Not available"}
								</p>
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
