import UserProfile from "@/components/UserProfile.tsx";

interface IServerConfigStatus {
	auth0ManagementApiConfigured?: boolean;
}

interface INavbarProps {
	isUserLoading: boolean;
	serverConfigStatus: IServerConfigStatus | null;
}

function Navbar({ isUserLoading, serverConfigStatus }: INavbarProps) {
	const showConfigBanner =
		!isUserLoading &&
		serverConfigStatus !== null &&
		serverConfigStatus.auth0ManagementApiConfigured === false;

	return (
		<>
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
				className={`bg-gray-900/95 backdrop-blur-md text-white sticky border-b border-gray-800 ${
					showConfigBanner ? "top-[38px]" : "top-0"
				} z-50 shadow-lg`}
			>
				<div className="flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
							<svg
								className="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>App Builder</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</div>
						<h1 className="text-xl font-bold text-white">Scaffolder</h1>
					</div>
					<div className="flex items-center gap-3">
						<UserProfile />
					</div>
				</div>
			</nav>
		</>
	);
}

export default Navbar;
