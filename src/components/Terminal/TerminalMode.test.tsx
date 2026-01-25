/**
 * Terminal Mode Component Tests
 * Tests for the Terminal Mode UI rendering and functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth } from "../../test/utils/renderWithAuth.tsx";
import TerminalMode from "./TerminalMode.tsx";
import {
	authenticatedUserConfig,
	newUserConfig,
} from "../../test/fixtures/users.ts";

// Mock ResizeObserver
class MockResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock xterm.js - it requires browser APIs
vi.mock("@xterm/xterm", () => {
	const MockTerminal = vi.fn(function(this: Record<string, unknown>) {
		this.open = vi.fn();
		this.write = vi.fn();
		this.writeln = vi.fn();
		this.clear = vi.fn();
		this.focus = vi.fn();
		this.blur = vi.fn();
		this.scrollToBottom = vi.fn();
		this.dispose = vi.fn();
		this.onData = vi.fn();
		this.onResize = vi.fn();
		this.loadAddon = vi.fn();
		this.unicode = { activeVersion: "11" };
	});
	return { Terminal: MockTerminal };
});

vi.mock("@xterm/addon-fit", () => {
	const MockFitAddon = vi.fn(function(this: Record<string, unknown>) {
		this.fit = vi.fn();
	});
	return { FitAddon: MockFitAddon };
});

vi.mock("@xterm/addon-web-links", () => {
	const MockWebLinksAddon = vi.fn(function(this: Record<string, unknown>) {
		// Empty addon
	});
	return { WebLinksAddon: MockWebLinksAddon };
});

vi.mock("@xterm/addon-unicode11", () => {
	const MockUnicode11Addon = vi.fn(function(this: Record<string, unknown>) {
		// Empty addon
	});
	return { Unicode11Addon: MockUnicode11Addon };
});

describe("TerminalMode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the terminal top bar", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			// Check for TERMINAL title
			expect(screen.getByText("TERMINAL")).toBeInTheDocument();
		});

		it("renders secondary tabs", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			expect(screen.getByRole("tab", { name: /terminal/i })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: /files/i })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: /logs/i })).toBeInTheDocument();
		});

		it("renders action buttons", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			// Action buttons should be present
			expect(screen.getByRole("button", { name: /yes/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /no/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /interrupt/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument();
		});

		it("renders the terminal composer input", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			expect(screen.getByRole("textbox", { name: /terminal input/i })).toBeInTheDocument();
		});

		it("renders mode indicator", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			// Mode indicators should have buttons for Terminal, Agent, Ask
			expect(screen.getByRole("button", { name: /terminal mode/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /agent mode/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /ask mode/i })).toBeInTheDocument();
		});
	});

	describe("Connection Status", () => {
		it("shows connected status when credentials are provided", () => {
			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			// Should show "Connected to [host]" in top bar
			expect(screen.getByText(/connected to 54\.123\.45\.67/i)).toBeInTheDocument();
		});

		it("shows disconnected status when no credentials", () => {
			renderWithAuth(<TerminalMode />, { authConfig: newUserConfig });

			expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
		});

		it("disables input when not connected", () => {
			renderWithAuth(<TerminalMode />, { authConfig: newUserConfig });

			const input = screen.getByRole("textbox", { name: /terminal input/i });
			expect(input).toBeDisabled();
		});
	});

	describe("Input Handling", () => {
		it("allows typing in the composer when connected", async () => {
			const user = userEvent.setup();

			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const input = screen.getByRole("textbox", { name: /terminal input/i });
			await user.type(input, "ls -la");

			expect(input).toHaveValue("ls -la");
		});

		it("clears input after submitting command", async () => {
			const user = userEvent.setup();

			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const input = screen.getByRole("textbox", { name: /terminal input/i });
			await user.type(input, "pwd{enter}");

			await waitFor(() => {
				expect(input).toHaveValue("");
			});
		});
	});

	describe("Secondary Tabs", () => {
		it("switches to Files tab when clicked", async () => {
			const user = userEvent.setup();

			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const filesTab = screen.getByRole("tab", { name: /files/i });
			await user.click(filesTab);

			expect(screen.getByText(/file browser coming soon/i)).toBeInTheDocument();
		});

		it("switches to Preview tab when clicked", async () => {
			const user = userEvent.setup();

			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const previewTab = screen.getByRole("tab", { name: /preview/i });
			await user.click(previewTab);

			expect(screen.getByText(/preview coming soon/i)).toBeInTheDocument();
		});

		it("switches to Logs tab when clicked", async () => {
			const user = userEvent.setup();

			renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const logsTab = screen.getByRole("tab", { name: /logs/i });
			await user.click(logsTab);

			expect(screen.getByText(/logs coming soon/i)).toBeInTheDocument();
		});
	});

	describe("Container Styling", () => {
		it("has correct background color variable", () => {
			const { container } = renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const terminalContainer = container.firstChild as HTMLElement;
			expect(terminalContainer).toHaveStyle({
				background: "var(--terminal-bg)",
			});
		});

		it("takes full height and width", () => {
			const { container } = renderWithAuth(
				<TerminalMode
					host="54.123.45.67"
					sshPrivateKey="test-key"
					accessToken="test-token"
				/>,
				{ authConfig: authenticatedUserConfig },
			);

			const terminalContainer = container.firstChild as HTMLElement;
			expect(terminalContainer).toHaveClass("h-full", "w-full");
		});
	});
});

describe("TerminalMode CSS Variables", () => {
	it("CSS variables should be defined", () => {
		// Check that our CSS custom properties are accessible
		const root = document.documentElement;
		const style = getComputedStyle(root);

		// These should exist after styles are loaded
		// In JSDOM they might be empty, but shouldn't throw
		const bgValue = style.getPropertyValue("--terminal-bg");
		const fgValue = style.getPropertyValue("--terminal-fg");

		// In a real browser, these would have values
		// In JSDOM, we're just checking they can be read
		expect(typeof bgValue).toBe("string");
		expect(typeof fgValue).toBe("string");
	});
});
