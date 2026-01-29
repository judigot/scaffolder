/**
 * MSW Request Handlers
 * Mock API endpoints for testing
 */

import { HttpResponse, http } from "msw";
import {
	mockInfraCredentials,
	mockUserMetadata,
} from "../../fixtures/users.ts";
import type {
	IMockCommandResponse,
	IMockTerraformRunResponse,
	IMockWorkspaceCreateRequest,
	IMockWorkspaceCreateResponse,
} from "../auth/types.ts";

// =============================================================================
// CONFIGURABLE MOCK STATE
// =============================================================================

interface IMockApiState {
	userMetadata: typeof mockUserMetadata;
	terraformStatus: "applied" | "planning" | "applying" | "errored" | "pending";
	terraformOutputs: {
		dev_ip?: string;
		ssh_command?: string;
	};
	commandResponses: Map<string, IMockCommandResponse>;
	isConnected: boolean;
	workspaces: Map<string, { id: string; name: string; mode: string }>;
	lastRunId: string | null;
	enableEc2: boolean;
}

export const mockApiState: IMockApiState = {
	userMetadata: mockUserMetadata,
	terraformStatus: "applied",
	terraformOutputs: {
		dev_ip: "54.123.45.67",
		ssh_command: "ssh ubuntu@54.123.45.67",
	},
	commandResponses: new Map(),
	isConnected: true,
	workspaces: new Map([
		[
			"test-workspace",
			{ id: "ws-test123", name: "test-workspace", mode: "api" },
		],
	]),
	lastRunId: null,
	enableEc2: true,
};

/** Reset mock state to defaults */
export function resetMockApiState() {
	mockApiState.userMetadata = mockUserMetadata;
	mockApiState.terraformStatus = "applied";
	mockApiState.terraformOutputs = {
		dev_ip: "54.123.45.67",
		ssh_command: "ssh ubuntu@54.123.45.67",
	};
	mockApiState.commandResponses.clear();
	mockApiState.isConnected = true;
	mockApiState.workspaces = new Map([
		[
			"test-workspace",
			{ id: "ws-test123", name: "test-workspace", mode: "api" },
		],
	]);
	mockApiState.lastRunId = null;
	mockApiState.enableEc2 = true;
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

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return HttpResponse.json({
			env: mockApiState.userMetadata.env,
			infra: mockApiState.userMetadata.infra,
		});
	}),

	http.post("/api/user-metadata/env", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as {
			envVariables: { key: string; value: string }[];
		};

		// Update mock state
		for (const { key, value } of body.envVariables) {
			mockApiState.userMetadata.env ??= {};
			mockApiState.userMetadata.env[key] = value;
		}

		return HttpResponse.json({ success: true });
	}),

	http.post("/api/user-metadata/infra", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as { infra?: Record<string, string> };
		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for infra fallback
		const nextInfra = body.infra ?? (body as Record<string, string>);

		// Update mock state
		mockApiState.userMetadata.infra = {
			...(mockApiState.userMetadata.infra ?? mockInfraCredentials),
			...nextInfra,
		};

		return HttpResponse.json({ success: true });
	}),

	// -------------------------------------------------------------------------
	// GitHub Token
	// -------------------------------------------------------------------------

	http.get("/api/github-token", ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
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

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as { token: string };
		mockApiState.userMetadata.github_token = body.token;

		return HttpResponse.json({ success: true });
	}),

	// -------------------------------------------------------------------------
	// Terraform Status
	// -------------------------------------------------------------------------

	http.post("/api/terraform/status", ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return HttpResponse.json({
			status: mockApiState.terraformStatus,
			outputs: mockApiState.terraformOutputs,
		});
	}),

	// -------------------------------------------------------------------------
	// Terminal Execute (Direct SSH Command)
	// -------------------------------------------------------------------------

	http.post("/api/terminal/execute", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!mockApiState.isConnected) {
			return HttpResponse.json(
				{ error: "SSH connection failed", message: "Connection refused" },
				{ status: 502 },
			);
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as {
			command: string;
			workingDirectory?: string;
			infraCredentials: {
				sshPrivateKey: string;
				host: string;
			};
		};

		const command = body.command;

		// Check for pre-configured response
		const configuredResponse = mockApiState.commandResponses.get(command);

		if (configuredResponse !== undefined) {
			return HttpResponse.json({
				success: configuredResponse.success,
				exitCode: configuredResponse.success ? 0 : 1,
				stdout: configuredResponse.output,
				stderr: configuredResponse.error ?? "",
			});
		}

		// Default command responses
		if (command.startsWith("ls")) {
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout:
					"total 4\ndrwxr-xr-x 2 user user 4096 Jan 25 00:00 .\ndrwxr-xr-x 3 user user 4096 Jan 25 00:00 ..\n-rw-r--r-- 1 user user    0 Jan 25 00:00 testfile",
				stderr: "",
			});
		}
		if (command.startsWith("pwd")) {
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout: "/home/ec2-user",
				stderr: "",
			});
		}
		if (command.startsWith("whoami")) {
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout: "ec2-user",
				stderr: "",
			});
		}
		if (command.startsWith("echo")) {
			const echoContent = command.replace(/^echo\s+/, "").replace(/["']/g, "");
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout: echoContent + "\n",
				stderr: "",
			});
		}
		if (command.startsWith("touch") || command.startsWith("mkdir")) {
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout: "",
				stderr: "",
			});
		}
		if (command === "clear") {
			return HttpResponse.json({
				success: true,
				exitCode: 0,
				stdout: "",
				stderr: "",
			});
		}

		// Default: return mock success
		return HttpResponse.json({
			success: true,
			exitCode: 0,
			stdout: `[mock] Executed: ${command}\n`,
			stderr: "",
		});
	}),

	// -------------------------------------------------------------------------
	// Agent Chat (AI-powered commands - deprecated for terminal)
	// -------------------------------------------------------------------------

	http.post("/api/agent/chat", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!mockApiState.isConnected) {
			return HttpResponse.json({ error: "Connection failed" }, { status: 503 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as {
			messages: { role: string; content: string }[];
			infraCredentials: {
				sshPrivateKey: string;
				host: string;
			};
		};

		// Extract command from message
		const messagesLength = body.messages.length;
		const lastMessage =
			messagesLength > 0 ? body.messages[messagesLength - 1] : undefined;
		const lastMessageContent = lastMessage?.content ?? "";
		const commandMatch = /```bash\n(.+?)\n```/s.exec(lastMessageContent);
		const command = commandMatch?.[1] ?? lastMessageContent;

		// Check for pre-configured response
		const configuredResponse = mockApiState.commandResponses.get(command);

		// Default command responses
		let response: IMockCommandResponse;

		if (configuredResponse !== undefined) {
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

	// -------------------------------------------------------------------------
	// Terraform Workspace Creation
	// -------------------------------------------------------------------------

	http.post("/api/terraform/workspace", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as IMockWorkspaceCreateRequest;

		if (
			body.tfcToken === "" ||
			body.tfcOrg === "" ||
			body.workspaceName === ""
		) {
			return HttpResponse.json(
				{
					error: "Missing required fields",
					message: "tfcToken, tfcOrg, and workspaceName are required.",
				},
				{ status: 400 },
			);
		}

		const workspaceId = `ws-${String(Date.now())}`;
		const workspace = {
			id: workspaceId,
			name: body.workspaceName,
			mode: body.mode,
		};

		mockApiState.workspaces.set(body.workspaceName, workspace);

		const response: IMockWorkspaceCreateResponse = {
			success: true,
			workspace: {
				id: workspaceId,
				name: body.workspaceName,
			},
			mode: body.mode,
			ec2InstanceType: body.ec2InstanceType,
			rdsInstanceClass: body.rdsInstanceClass,
		};

		return HttpResponse.json(response);
	}),

	// -------------------------------------------------------------------------
	// Terraform Run (Trigger apply/destroy)
	// -------------------------------------------------------------------------

	http.post("/api/terraform/run", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW handler requires type assertion for request body
		const body = (await request.json()) as {
			enableEc2: boolean;
			tfcToken: string;
			tfcOrg: string;
			tfcWorkspace: string;
			awsAccessKeyId: string;
			awsSecretAccessKey: string;
			sshPublicKey: string;
		};

		if (
			body.tfcToken === "" ||
			body.tfcOrg === "" ||
			body.tfcWorkspace === ""
		) {
			return HttpResponse.json(
				{ error: "Missing Terraform Cloud credentials" },
				{ status: 400 },
			);
		}

		mockApiState.enableEc2 = body.enableEc2;
		const runId = `run-${String(Date.now())}`;
		mockApiState.lastRunId = runId;

		const response: IMockTerraformRunResponse = {
			success: true,
			run: {
				id: runId,
				status: "planning",
			},
		};

		return HttpResponse.json(response);
	}),

	// -------------------------------------------------------------------------
	// Terraform Run Status (Poll for run completion)
	// -------------------------------------------------------------------------

	http.post("/api/terraform/run/:runId", ({ request, params }) => {
		const authHeader = request.headers.get("Authorization");

		if (authHeader?.startsWith("Bearer ") !== true) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { runId } = params;

		const response: IMockTerraformRunResponse = {
			success: true,
			run: {
				// eslint-disable-next-line no-type-assertion/no-type-assertion -- MSW route params require type assertion
				id: runId as string,
				status: "applied",
			},
		};

		return HttpResponse.json(response);
	}),
];
