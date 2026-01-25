import { useAuth0 } from "@auth0/auth0-react";
import { type ReactNode, useEffect, useState } from "react";

interface IAuthGuardProps {
	children: ReactNode;
}

const isMockAuthEnabled = (): boolean => {
	return (
		typeof window !== "undefined" &&
		window.__MOCK_AUTH__?.isAuthenticated === true
	);
};

export default function AuthGuard({ children }: IAuthGuardProps) {
	const { isAuthenticated, isLoading, error, loginWithRedirect } = useAuth0();
	const [showDebug, setShowDebug] = useState(false);
	const mockAuth = isMockAuthEnabled();

	useEffect(() => {
		const timer = setTimeout(() => {
			setShowDebug(true);
		}, 5000);

		return () => {
			clearTimeout(timer);
		};
	}, []);

	if (error) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-black text-white p-8">
				<div className="bg-bg-subtle border border-danger-900 rounded-lg p-8 max-w-md w-full shadow-2xl">
					<div className="flex items-center justify-center mb-6">
						<svg
							className="w-16 h-16 text-red-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							aria-label="Error icon"
						>
							<title>Error icon</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-center mb-4">
						Authentication Error
					</h2>
					<p className="text-fg-muted text-center mb-6 text-sm">
						{error.message}
					</p>
					<button
						type="button"
						onClick={() => {
							void loginWithRedirect();
						}}
						className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-bg-subtle"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-black text-white">
				<div className="flex flex-col items-center">
					<div className="relative w-20 h-20 mb-8">
						<div className="absolute inset-0 border-4 border-neutral-800 rounded-full"></div>
						<div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
					</div>
					<h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
						Scaffolder
					</h2>
					<p className="text-fg-subtle text-sm">Authenticating...</p>
					{showDebug && (
						<div className="mt-8 px-6 py-4 bg-bg-subtle border border-border rounded-lg">
							<p className="text-xs text-fg-muted mb-2 font-semibold">
								Debug Information:
							</p>
							<div className="text-xs text-fg-subtle space-y-1">
								<div>
									isLoading:{" "}
									<span className="text-fg-muted">{String(isLoading)}</span>
								</div>
								<div>
									isAuthenticated:{" "}
									<span className="text-fg-muted">
										{String(isAuthenticated)}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	if (!isAuthenticated && !mockAuth) {
		void loginWithRedirect();
		return null;
	}

	return <>{children}</>;
}
