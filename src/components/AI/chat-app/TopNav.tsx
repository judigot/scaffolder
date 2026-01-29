import UserProfile from "@/components/UserProfile.tsx";
import { useUser } from "@/hooks/useUser.ts";
import { isMasterDeveloper, useUIStore } from "@/useUIStore.ts";

interface ITopNavProps {
	isUserLoading: boolean;
	serverConfigStatus: { auth0ManagementApiConfigured?: boolean } | null;
}

export default function TopNav({
	isUserLoading,
	serverConfigStatus,
}: ITopNavProps) {
	const { topLevelTab: activeTab, setTopLevelTab: onTabChange } = useUIStore();
	const { user } = useUser();
	const showMasterView = isMasterDeveloper(
		user?.nickname as string | undefined,
	);
	const showConfigBanner =
		!isUserLoading &&
		serverConfigStatus !== null &&
		serverConfigStatus.auth0ManagementApiConfigured === false;

	return (
		<>
			{showConfigBanner && (
				<div className="bg-bg border-b border-danger-700 pt-2 pb-2 px-4 sticky top-0 z-[60]">
					<div className="flex items-center justify-center gap-2">
						<svg
							className="w-4 h-4 text-danger-400 flex-shrink-0"
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
						<p className="text-xs text-danger-300">
							<span className="font-medium">Developer Notice:</span> Auth0
							Management API credentials not configured. User metadata and
							GitHub token features unavailable. Set{" "}
							<code className="bg-danger-900/50 px-1 py-0.5 rounded text-danger-200">
								AUTH0_MANAGEMENT_API_CLIENT_ID
							</code>{" "}
							and{" "}
							<code className="bg-danger-900/50 px-1 py-0.5 rounded text-danger-200">
								AUTH0_MANAGEMENT_API_CLIENT_SECRET
							</code>{" "}
							in{" "}
							<code className="bg-danger-900/50 px-1 py-0.5 rounded text-danger-200">
								.env
							</code>
						</p>
					</div>
				</div>
			)}
			<nav
				className={`bg-bg-subtle text-fg sticky border-b border-border ${
					showConfigBanner ? "top-[38px]" : "top-0"
				} z-50`}
			>
				<div className="flex items-center justify-between px-4 py-2">
					{/* Left: Top-level tabs */}
					<div className="flex items-center gap-1">
						{showMasterView && (
							<button
								type="button"
								onClick={() => {
									onTabChange("master");
								}}
								className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
									activeTab === "master"
										? "bg-success-900/30 text-success-300 border border-success-600/40"
										: "text-success-400 hover:text-success-300 hover:bg-success-900/20"
								}`}
							>
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<title>Master View</title>
									<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
								</svg>
								Master View
							</button>
						)}
						<button
							type="button"
							onClick={() => {
								onTabChange("scaffolder");
							}}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
								activeTab === "scaffolder"
									? "bg-primary-900/30 text-fg border border-primary-600/40"
									: "text-fg-muted hover:text-fg hover:bg-secondary"
							}`}
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<title>Scaffolder</title>
								<path d="M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14zM6 13h5v4H6zm6-6h4v3h-4zM6 7h5v5H6zm6 4h4v6h-4z" />
							</svg>
							Scaffolder
						</button>
						<button
							type="button"
							onClick={() => {
								onTabChange("repositories");
							}}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
								activeTab === "repositories"
									? "bg-primary-900/30 text-fg border border-primary-600/40"
									: "text-fg-muted hover:text-fg hover:bg-secondary"
							}`}
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<title>Repositories</title>
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
							</svg>
							Repositories
						</button>
					</div>

					{/* Right: User profile */}
					<UserProfile />
				</div>
			</nav>
		</>
	);
}
