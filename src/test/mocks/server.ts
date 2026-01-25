/**
 * MSW Server Setup
 * For Node.js (Vitest) and Browser environments
 */

import { setupServer } from "msw/node";
import { handlers, resetMockApiState } from "./api/handlers.ts";

// Create server instance with all handlers
export const server = setupServer(...handlers);

// Export utilities
export { resetMockApiState };

// Lifecycle helpers for tests
export function setupMockServer() {
	beforeAll(() => {
		server.listen({ onUnhandledRequest: "warn" });
	});

	afterEach(() => {
		server.resetHandlers();
		resetMockApiState();
	});

	afterAll(() => {
		server.close();
	});
}
