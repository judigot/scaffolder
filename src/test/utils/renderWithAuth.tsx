/**
 * Test Render Utilities
 * Render components with mock authentication
 */

import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { MockAuthProvider } from "../mocks/auth/MockAuthProvider.tsx";
import type { IMockAuthConfig } from "../mocks/auth/types.ts";
import { authenticatedUserConfig } from "../fixtures/users.ts";

// =============================================================================
// PROVIDERS WRAPPER
// =============================================================================

function createWrapper(authConfig?: IMockAuthConfig) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<MockAuthProvider config={authConfig ?? authenticatedUserConfig}>
					{children}
				</MockAuthProvider>
			</QueryClientProvider>
		);
	};
}

// =============================================================================
// RENDER WITH AUTH
// =============================================================================

interface IRenderWithAuthOptions extends Omit<RenderOptions, "wrapper"> {
	authConfig?: IMockAuthConfig;
}

export function renderWithAuth(
	ui: ReactElement,
	options: IRenderWithAuthOptions = {},
) {
	const { authConfig, ...renderOptions } = options;

	return render(ui, {
		wrapper: createWrapper(authConfig),
		...renderOptions,
	});
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-exports are in testingLibrary.ts to satisfy react-refresh rule
