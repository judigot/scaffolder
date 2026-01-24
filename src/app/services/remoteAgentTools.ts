import type { Client } from "ssh2";
import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
	executeCommand,
	readFile,
	writeFile,
	listDirectory,
} from "@/app/services/sshService.ts";

interface IToolResult {
	success: boolean;
	output?: string;
	error?: string;
}

export function createRemoteAgentTools(client: Client) {
	return {
		execute_command: tool({
			description:
				"Execute a shell command on the remote Linux server. Use this for running scripts, installing packages, git operations, or any terminal command.",
			inputSchema: zodSchema(
				z.object({
					command: z.string().describe("The shell command to execute"),
					workingDirectory: z
						.string()
						.optional()
						.describe("Working directory for the command (absolute path)"),
				}),
			),
			execute: async ({
				command,
				workingDirectory,
			}): Promise<IToolResult> => {
				try {
					const fullCommand = workingDirectory
						? `cd ${workingDirectory} && ${command}`
						: command;
					const result = await executeCommand(client, fullCommand);
					if (result.exitCode !== 0) {
						return {
							success: false,
							output: result.stdout || undefined,
							error:
								result.stderr ||
								`Command exited with code ${String(result.exitCode)}`,
						};
					}
					return {
						success: true,
						output: result.stdout || "(no output)",
					};
				} catch (err: unknown) {
					return {
						success: false,
						error:
							err instanceof Error ? err.message : "Command execution failed",
					};
				}
			},
		}),

		read_file: tool({
			description:
				"Read the contents of a file on the remote server. Returns the full file content.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe("Absolute path to the file to read"),
				}),
			),
			execute: async ({ path }): Promise<IToolResult> => {
				try {
					const result = await readFile(client, path);
					if (result.exitCode !== 0) {
						return {
							success: false,
							error: result.stderr || `Failed to read file: ${path}`,
						};
					}
					return {
						success: true,
						output: result.stdout,
					};
				} catch (err: unknown) {
					return {
						success: false,
						error:
							err instanceof Error ? err.message : "Failed to read file",
					};
				}
			},
		}),

		write_file: tool({
			description:
				"Write content to a file on the remote server. Creates parent directories if they don't exist. Overwrites existing files.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe("Absolute path where the file should be written"),
					content: z
						.string()
						.describe("The content to write to the file"),
				}),
			),
			execute: async ({ path, content }): Promise<IToolResult> => {
				try {
					const result = await writeFile(client, path, content);
					if (result.exitCode !== 0) {
						return {
							success: false,
							error: result.stderr || `Failed to write file: ${path}`,
						};
					}
					return {
						success: true,
						output: `File written successfully: ${path}`,
					};
				} catch (err: unknown) {
					return {
						success: false,
						error:
							err instanceof Error ? err.message : "Failed to write file",
					};
				}
			},
		}),

		list_directory: tool({
			description:
				"List files and directories at the given path on the remote server. Returns detailed listing with permissions, sizes, and timestamps.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe("Absolute path to the directory to list"),
				}),
			),
			execute: async ({ path }): Promise<IToolResult> => {
				try {
					const result = await listDirectory(client, path);
					if (result.exitCode !== 0) {
						return {
							success: false,
							error: result.stderr || `Failed to list directory: ${path}`,
						};
					}
					return {
						success: true,
						output: result.stdout,
					};
				} catch (err: unknown) {
					return {
						success: false,
						error:
							err instanceof Error
								? err.message
								: "Failed to list directory",
					};
				}
			},
		}),
	};
}
