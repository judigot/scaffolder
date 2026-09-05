/**
 * Mock Auth Utilities
 * Helper functions for mock auth configuration
 */

import type { IMockAuthConfig } from "./types.ts";

/**
 * Type predicate to check if window has mock auth config
 */
const hasMockAuth = (
	win: Window,
): win is Window & { __MOCK_AUTH__: IMockAuthConfig } => {
	return (
		"__MOCK_AUTH__" in win &&
		typeof win.__MOCK_AUTH__ === "object" &&
		win.__MOCK_AUTH__ !== null
	);
};

/** Check if we're in mock auth mode */
export function isMockAuthEnabled(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return hasMockAuth(window) || import.meta.env.VITE_MOCK_AUTH === "true";
}

/** Get mock auth config from window */
export function getMockAuthConfig(): IMockAuthConfig | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	if (!hasMockAuth(window)) {
		return undefined;
	}
	return window.__MOCK_AUTH__;
}
