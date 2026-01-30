/**
 * Bun test setup file
 * Registers happy-dom globals and configures the test environment
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, mock } from "bun:test";
import { cleanup } from "@testing-library/react";
import { resetMockApiState, server } from "./src/test/mocks/server.ts";

// Register happy-dom globals (document, window, etc.)
GlobalRegistrator.register();

// MSW Server Lifecycle
beforeAll(() => {
	server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
	resetMockApiState();
});

afterAll(() => {
	server.close();
});

// Mock ResizeObserver (not provided by happy-dom)
globalThis.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock matchMedia (not fully implemented in happy-dom)
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: mock((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: mock(() => {}),
		removeListener: mock(() => {}),
		addEventListener: mock(() => {}),
		removeEventListener: mock(() => {}),
		dispatchEvent: mock(() => {}),
	})),
});
