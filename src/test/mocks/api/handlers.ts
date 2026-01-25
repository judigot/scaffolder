/**
 * MSW Request Handlers
 * Mock API endpoints for testing
 */

import { http, HttpResponse } from "msw";
import {
	mockUserMetadata,
	mockInfraCredentials,
} from "../../fixtures/users.ts";
import type { IMockCommandResponse } from "../auth/types.ts";

// =============================================================================
// CONFIGURABLE MOCK STATE
// =============================================================================

interface IMockApiState {
	userMetadata: typeof mockUserMetadata;
	terraformStatus: "applied" | "planning" | "applying" | "errored" | "pending";
	terraformOutputs: {
		dev_ip?: string;
	};
	commandResponses: Map<string, IMockCommandResponse>;
	isConnected: boolean;
}

export const mockApiState: IMockApiState = {
	userMetadata: mockUserMetadata,
	terraformStatus: "applied",
	terraformOutputs: {
		dev_ip: "54.123.45.67",
	},
	commandResponses: new Map(),
	isConnected: true,
};

/** Reset mock state to defaults */
export function resetMockApiState() {
	mockApiState.userMetadata = mockUserMetadata;
	mockApiState.terraformStatus = "applied";
	mockApiState.terraformOutputs = { dev_ip: "54.123.45.67" };
	mockApiState.commandResponses.clear();
	mockApiState.isConnected = true;
}

/** Set a mock command response */
export function setMockCommandResponse(
	command: string,
	response: IMockCommandResponse,
) {
	mockApiState.commandResponses.set(command, response);
}

// =============================================================================
// HANDLERS
// =============================================================================

export const handlers = [
	// -------------------------------------------------------------------------
	// User Metadata
	// -------------------------------------------------------------------------

	http.get("/api/user-metadata", ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return HttpResponse.json({
			env: mockApiState.userMetadata.env,
			infra: mockApiState.userMetadata.infra,
		});
	}),

	http.post("/api/user-metadata/env", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as {
			envVariables: { key: string; value: string }[];
		};

		// Update mock state
		for (const { key, value } of body.envVariables) {
			if (!mockApiState.userMetadata.env) {
				mockApiState.userMetadata.env = {};
			}
			mockApiState.userMetadata.env[key] = value;
		}

		return HttpResponse.json({ success: true });
	}),

	http.post("/api/user-metadata/infra", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as typeof mockInfraCredentials;

		// Update mock state
		mockApiState.userMetadata.infra = body;

		return HttpResponse.json({ success: true });
	}),

	// -------------------------------------------------------------------------
	// GitHub Token
	// -------------------------------------------------------------------------

	http.get("/api/github-token", ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return HttpResponse.json({
			token: mockApiState.userMetadata.github_token ?? null,
			encryptionAvailable: true,
			isTokenEncrypted: false,
			serverConfigStatus: {
				hasEncryptionKey: true,
				hasAuth0Config: true,
			},
		});
	}),

	http.post("/api/github-token", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as { token: string };
		mockApiState.userMetadata.github_token = body.token;

		return HttpResponse.json({ success: true });
	}),

	// -------------------------------------------------------------------------
	// Terraform Status
	// -------------------------------------------------------------------------

	http.post("/api/terraform/status", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return HttpResponse.json({
			status: mockApiState.terraformStatus,
			outputs: mockApiState.terraformOutputs,
		});
	}),

	// -------------------------------------------------------------------------
	// Agent Chat (Terminal Command Execution)
	// -------------------------------------------------------------------------

	http.post("/api/agent/chat", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!mockApiState.isConnected) {
			return HttpResponse.json(
				{ error: "Connection failed" },
				{ status: 503 },
			);
		}

		const body = (await request.json()) as {
			messages: { role: string; content: string }[];
			infraCredentials: {
				sshPrivateKey: string;
				host: string;
			};
		};

		// Extract command from message
		const lastMessage = body.messages[body.messages.length - 1];
		const commandMatch = /```bash\n(.+?)\n```/s.exec(lastMessage?.content);
		const command = commandMatch?.[1] ?? lastMessage?.content ?? "";

		// Check for pre-configured response
		const configuredResponse = mockApiState.commandResponses.get(command);

		// Default command responses
		let response: IMockCommandResponse;

		if (configuredResponse) {
			response = configuredResponse;
		} else if (command.startsWith("ls")) {
			response = {
				success: true,
				output:
					"total 4\ndrwxr-xr-x 2 user user 4096 Jan 25 00:00 .\ndrwxr-xr-x 3 user user 4096 Jan 25 00:00 ..\n-rw-r--r-- 1 user user    0 Jan 25 00:00 testfile",
			};
		} else if (command.startsWith("pwd")) {
			response = { success: true, output: "/home/user" };
		} else if (command.startsWith("whoami")) {
			response = { success: true, output: "user" };
		} else if (command.startsWith("echo")) {
			const echoContent = command.replace(/^echo\s+/, "").replace(/"/g, "");
			response = { success: true, output: echoContent };
		} else if (command.startsWith("touch")) {
			response = { success: true, output: "" };
		} else if (command.startsWith("cat")) {
			response = {
				success: false,
				output: "",
				error: "cat: file not found",
			};
		} else {
			response = {
				success: true,
				output: `[mock] Executed: ${command}`,
			};
		}

		// Return SSE-like response
		const sseData = JSON.stringify({
			type: "tool-result",
			result: response,
		});

		return new HttpResponse(`data: ${sseData}\n\n`, {
			headers: {
				"Content-Type": "text/event-stream",
			},
		});
	}),
];
