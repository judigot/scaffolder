import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useState } from "react";

interface RepoStatusInfo {
	branch: string | null;
	isDirty: boolean;
	ahead: number;
	behind: number;
	lastCommit: { hash: string; message: string; date: string } | null;
}

interface RepoStatusPanelProps {
	repoPath: string | undefined;
	onFetch?: () => void;
	onPull?: () => void;
	onDeleteClone?: () => void;
}

type OperationStatus = "idle" | "loading" | "success" | "error";

export default function RepoStatusPanel({
	repoPath,
	onFetch,
	onPull,
	onDeleteClone,
}: RepoStatusPanelProps) {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();
	const [status, setStatus] = useState<RepoStatusInfo | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchStatus, setFetchStatus] = useState<OperationStatus>("idle");
	const [pullStatus, setPullStatus] = useState<OperationStatus>("idle");

	const fetchStatus_ = useCallback(async () => {
		if (!repoPath || !isAuthenticated) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const token = await getAccessTokenSilently();
			const response = await fetch("/api/local-repo/status-info", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ repoPath }),
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(errorData.error ?? "Failed to fetch status");
			}

			const data = (await response.json()) as RepoStatusInfo & { ok: boolean };
			if (data.ok) {
				setStatus(data);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, [repoPath, isAuthenticated, getAccessTokenSilently]);

	useEffect(() => {
		void fetchStatus_();
	}, [fetchStatus_]);

	const handleFetch = async () => {
		if (!repoPath || !isAuthenticated) {
			return;
		}

		setFetchStatus("loading");
		try {
			const token = await getAccessTokenSilently();
			const response = await fetch("/api/local-repo/fetch", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ repoPath }),
			});

			if (!response.ok) {
				setFetchStatus("error");
				return;
			}

			setFetchStatus("success");
			onFetch?.();
			// Refresh status after fetch
			void fetchStatus_();
			// Reset status after 2 seconds
			setTimeout(() => {
				setFetchStatus("idle");
			}, 2000);
		} catch {
			setFetchStatus("error");
			setTimeout(() => {
				setFetchStatus("idle");
			}, 2000);
		}
	};

	const handlePull = async () => {
		if (!repoPath || !isAuthenticated) {
			return;
		}

		setPullStatus("loading");
		try {
			const token = await getAccessTokenSilently();
			const response = await fetch("/api/local-repo/pull", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ repoPath }),
			});

			if (!response.ok) {
				setPullStatus("error");
				return;
			}

			setPullStatus("success");
			onPull?.();
			// Refresh status after pull
			void fetchStatus_();
			// Reset status after 2 seconds
			setTimeout(() => {
				setPullStatus("idle");
			}, 2000);
		} catch {
			setPullStatus("error");
			setTimeout(() => {
				setPullStatus("idle");
			}, 2000);
		}
	};

	if (!repoPath) {
		return (
			<div className="p-3 text-xs text-fg-subtle">No local clone available</div>
		);
	}

	if (isLoading && status === null) {
		return (
			<div className="p-3 flex items-center gap-2 text-xs text-fg-subtle">
				<div className="w-3 h-3 border border-fg-subtle border-t-transparent rounded-full animate-spin" />
				Loading status...
			</div>
		);
	}

	if (error !== null) {
		return <div className="p-3 text-xs text-danger-300">{error}</div>;
	}

	if (status === null) {
		return null;
	}

	const shortHash = status.lastCommit?.hash.slice(0, 7) ?? "";
	const commitDate = status.lastCommit?.date
		? new Date(status.lastCommit.date).toLocaleDateString()
		: "";

	return (
		<div className="space-y-3">
			{/* Branch and status */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<svg
						className="w-4 h-4 text-fg-subtle flex-shrink-0"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<title>Branch</title>
						<path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm12 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM6 9v2m0 0v2m12-2H6" />
					</svg>
					<span className="text-sm font-medium text-fg truncate">
						{status.branch ?? "detached"}
					</span>
				</div>
				<div className="flex items-center gap-1 flex-shrink-0">
					{status.isDirty && (
						<span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-warning-900/40 text-warning-300 border border-warning-600/30">
							Modified
						</span>
					)}
					{!status.isDirty && (
						<span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-success-900/40 text-success-300 border border-success-600/30">
							Clean
						</span>
					)}
				</div>
			</div>

			{/* Ahead/behind */}
			{(status.ahead > 0 || status.behind > 0) && (
				<div className="flex items-center gap-3 text-xs text-fg-muted">
					{status.ahead > 0 && (
						<span className="flex items-center gap-1">
							<svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
								<title>Ahead</title>
								<path d="M7 14l5-5 5 5H7z" />
							</svg>
							{status.ahead} ahead
						</span>
					)}
					{status.behind > 0 && (
						<span className="flex items-center gap-1">
							<svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
								<title>Behind</title>
								<path d="M7 10l5 5 5-5H7z" />
							</svg>
							{status.behind} behind
						</span>
					)}
				</div>
			)}

			{/* Last commit */}
			{status.lastCommit !== null && (
				<div className="text-xs text-fg-subtle space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-mono text-fg-muted">{shortHash}</span>
						<span>{commitDate}</span>
					</div>
					<p className="truncate" title={status.lastCommit.message}>
						{status.lastCommit.message}
					</p>
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-2 pt-1">
				<button
					type="button"
					onClick={() => void handleFetch()}
					disabled={fetchStatus === "loading"}
					className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
						fetchStatus === "success"
							? "bg-success-900/40 text-success-300 border border-success-600/30"
							: fetchStatus === "error"
								? "bg-danger-900/40 text-danger-300 border border-danger-600/30"
								: "bg-secondary text-fg-muted hover:text-fg hover:bg-secondary-hover border border-border"
					}`}
				>
					{fetchStatus === "loading" ? (
						<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
					) : (
						<svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
							<title>Fetch</title>
							<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
						</svg>
					)}
					Fetch
				</button>
				<button
					type="button"
					onClick={() => void handlePull()}
					disabled={pullStatus === "loading" || status.isDirty}
					title={
						status.isDirty
							? "Cannot pull with uncommitted changes"
							: "Pull latest changes"
					}
					className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
						pullStatus === "success"
							? "bg-success-900/40 text-success-300 border border-success-600/30"
							: pullStatus === "error"
								? "bg-danger-900/40 text-danger-300 border border-danger-600/30"
								: status.isDirty
									? "bg-secondary text-fg-subtle border border-border cursor-not-allowed opacity-50"
									: "bg-secondary text-fg-muted hover:text-fg hover:bg-secondary-hover border border-border"
					}`}
				>
					{pullStatus === "loading" ? (
						<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
					) : (
						<svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
							<title>Pull</title>
							<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
						</svg>
					)}
					Pull
				</button>
			</div>

			{/* Delete clone action */}
			{onDeleteClone !== undefined && (
				<button
					type="button"
					onClick={onDeleteClone}
					className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-subtle hover:text-danger-300 hover:bg-danger-900/20 transition-colors"
				>
					<svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
						<title>Delete clone</title>
						<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
					</svg>
					Delete local clone
				</button>
			)}
		</div>
	);
}
