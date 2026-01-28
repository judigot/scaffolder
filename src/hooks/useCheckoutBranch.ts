import { useState } from "react";

interface CheckoutOptions {
	repoId: string;
	localPath?: string;
	branch: string;
}

interface CheckoutResult {
	ok: boolean;
	exitCode?: number;
	stdout?: string;
	stderr?: string;
	timedOut?: boolean;
	durationMs?: number;
	error?: string;
}

export function useCheckoutBranch() {
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const checkout = async (
		options: CheckoutOptions,
	): Promise<CheckoutResult | null> => {
		if (!options.branch) {
			return null;
		}

		setIsCheckingOut(true);
		setError(null);

		try {
			const response = await fetch("/api/local-repo/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					repoId: options.repoId,
					localPath: options.localPath,
					branch: options.branch,
				}),
			});

			const result: CheckoutResult = await response.json();

			if (!response.ok || !result.ok) {
				const errorMsg =
					result.error || result.stderr || "Failed to checkout branch";
				setError(errorMsg);
				return result;
			}

			return result;
		} catch (err) {
			const errorMsg =
				err instanceof Error
					? err.message
					: "An error occurred during checkout";
			setError(errorMsg);
			return { ok: false, error: errorMsg };
		} finally {
			setIsCheckingOut(false);
		}
	};

	return {
		checkout,
		isCheckingOut,
		error,
	};
}
