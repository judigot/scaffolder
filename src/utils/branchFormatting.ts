/**
 * Utility functions for formatting branch names in the UI
 * Handles Claude/Cursor style branch names with hash suffixes
 */

/**
 * Extract the short hash from a branch name
 * @param branch - Branch name (e.g., "feat/add-auth-Xa9K2")
 * @returns Short hash (e.g., "Xa9K2") or empty string if not found
 */
export function getShortHash(branch: string): string {
	const match = /-([a-zA-Z0-9]{5})$/.exec(branch);
	return match?.[1] ?? "";
}

/**
 * Format branch name for display by removing hash suffix
 * @param branch - Branch name (e.g., "feat/add-auth-Xa9K2")
 * @returns Formatted name (e.g., "feat/add-auth")
 */
export function formatBranchName(branch: string): string {
	// Remove -xxxxx suffix (5 char hash)
	return branch.replace(/-[a-zA-Z0-9]{5}$/, "");
}

/**
 * Check if a branch name has a hash suffix
 * @param branch - Branch name to check
 * @returns True if branch has a 5-character hash suffix
 */
export function hasHashSuffix(branch: string): boolean {
	return /-[a-zA-Z0-9]{5}$/.test(branch);
}

/**
 * Split branch name into display name and hash
 * @param branch - Branch name (e.g., "feat/add-auth-Xa9K2")
 * @returns Object with displayName and hash
 */
export function splitBranchName(branch: string): {
	displayName: string;
	hash: string;
} {
	const hash = getShortHash(branch);
	const displayName = hash ? formatBranchName(branch) : branch;
	return { displayName, hash };
}
