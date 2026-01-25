import type { TerminalConnectionStatus, TerminalSecondaryTab } from "@/useTerminalStore.ts";

interface ITerminalTopBarProps {
	connectionStatus: TerminalConnectionStatus;
	activeTab: TerminalSecondaryTab;
	onTabChange: (tab: TerminalSecondaryTab) => void;
	host?: string;
}

/**
 * Connection status indicator with appropriate styling
 */
function ConnectionIndicator({
	status,
	host,
}: {
	status: TerminalConnectionStatus;
	host?: string;
}) {
	const statusConfig = {
		connected: {
			dotClass: "bg-[var(--terminal-status-connected)]",
			label: host ? `Connected to ${host}` : "Connected",
			animation: "",
		},
		reconnecting: {
			dotClass: "bg-[var(--terminal-status-reconnecting)]",
			label: "Reconnecting...",
			animation: "terminal-status-reconnecting",
		},
		disconnected: {
			dotClass: "bg-[var(--terminal-status-disconnected)]",
			label: "Disconnected",
			animation: "",
		},
	};

	const config = statusConfig[status];

	return (
		<div className="flex items-center gap-2 text-xs">
			<span
				className={`w-2 h-2 rounded-full ${config.dotClass} ${config.animation}`}
				aria-hidden="true"
			/>
			<span className="text-[var(--terminal-topbar-text)] truncate max-w-[120px] sm:max-w-[200px]">
				{config.label}
			</span>
		</div>
	);
}

/**
 * Secondary tab button
 */
function SecondaryTab({
	label,
	isActive,
	onClick,
}: {
	label: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
				${
					isActive
						? "bg-[var(--terminal-tab-bg-active)] text-[var(--terminal-topbar-text-active)] border-b-2 border-[var(--terminal-tab-border-active)]"
						: "bg-[var(--terminal-tab-bg)] text-[var(--terminal-topbar-text)] hover:bg-[var(--terminal-tab-bg-hover)]"
				}
			`}
			aria-selected={isActive}
			role="tab"
		>
			{label}
		</button>
	);
}

/**
 * TerminalTopBar - Top bar for Terminal Mode
 *
 * Features:
 * - Title: TERMINAL
 * - Secondary tabs (non-modal): Terminal, Files, Preview, Logs
 * - Connection indicator (Connected/Reconnecting/Disconnected)
 */
export default function TerminalTopBar({
	connectionStatus,
	activeTab,
	onTabChange,
	host,
}: ITerminalTopBarProps) {
	const tabs: { id: TerminalSecondaryTab; label: string }[] = [
		{ id: "terminal", label: "Terminal" },
		{ id: "files", label: "Files" },
		{ id: "preview", label: "Preview" },
		{ id: "logs", label: "Logs" },
	];

	return (
		<div
			className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b shrink-0"
			style={{
				background: "var(--terminal-topbar-bg)",
				borderColor: "var(--terminal-topbar-border)",
			}}
		>
			{/* Left: Title and secondary tabs */}
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Title - hidden on very small screens */}
				<h1
					className="hidden sm:block text-sm font-bold tracking-wide"
					style={{ color: "var(--terminal-topbar-text-active)" }}
				>
					TERMINAL
				</h1>

				{/* Secondary tabs */}
				<nav
					className="flex items-center gap-1"
					role="tablist"
					aria-label="Terminal sections"
				>
					{tabs.map((tab) => (
						<SecondaryTab
							key={tab.id}
							label={tab.label}
							isActive={activeTab === tab.id}
							onClick={() => {
								onTabChange(tab.id);
							}}
						/>
					))}
				</nav>
			</div>

			{/* Right: Connection indicator */}
			<ConnectionIndicator status={connectionStatus} host={host} />
		</div>
	);
}
