import type { Octokit } from "@octokit/rest";
import { tool, zodSchema } from "ai";
import { z } from "zod";

interface IToolResult {
	success: boolean;
	output?: string;
	error?: string;
	url?: string;
}

interface IRepoContext {
	owner: string;
	repo: string;
	baseBranch: string;
}

/**
 * Creates tools for the repository agent to interact with GitHub
 */
export function createRepoAgentTools(octokit: Octokit, context: IRepoContext) {
	const { owner, repo, baseBranch } = context;

	return {
		read_file: tool({
			description:
				"Read the contents of a file from the repository. Returns the file content as text.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe(
							"Path to the file relative to repository root (e.g., 'src/index.ts')",
						),
					branch: z
						.string()
						.optional()
						.describe("Branch to read from (defaults to base branch)"),
				}),
			),
			execute: async ({ path, branch }): Promise<IToolResult> => {
				try {
					const response = await octokit.repos.getContent({
						owner,
						repo,
						path,
						ref: branch ?? baseBranch,
					});

					if (Array.isArray(response.data)) {
						return {
							success: false,
							error: `Path '${path}' is a directory, not a file`,
						};
					}

					if (!("content" in response.data)) {
						return {
							success: false,
							error: `Unable to read content from '${path}'`,
						};
					}

					const content = Buffer.from(response.data.content, "base64").toString(
						"utf-8",
					);
					return {
						success: true,
						output: content,
					};
				} catch (err: unknown) {
					if (err instanceof Error && "status" in err && err.status === 404) {
						return {
							success: false,
							error: `File not found: ${path}`,
						};
					}
					return {
						success: false,
						error: err instanceof Error ? err.message : "Failed to read file",
					};
				}
			},
		}),

		write_file: tool({
			description:
				"Create or update a file in the repository. The file will be committed to the specified branch.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.describe(
							"Path where the file should be created/updated (e.g., 'src/utils/helper.ts')",
						),
					content: z.string().describe("The content to write to the file"),
					branch: z
						.string()
						.describe(
							"Branch name to commit to (must be a scaffolder/* branch)",
						),
					commitMessage: z
						.string()
						.describe("Commit message describing the change"),
				}),
			),
			execute: async ({
				path,
				content,
				branch,
				commitMessage,
			}): Promise<IToolResult> => {
				// Enforce scaffolder branch naming
				if (!branch.startsWith("scaffolder/")) {
					return {
						success: false,
						error:
							"Branch name must start with 'scaffolder/' (e.g., scaffolder/add-login-feature)",
					};
				}

				try {
					// Check if file exists to get SHA
					let fileSha: string | undefined;
					try {
						const existingFile = await octokit.repos.getContent({
							owner,
							repo,
							path,
							ref: branch,
						});

						if (
							!Array.isArray(existingFile.data) &&
							"sha" in existingFile.data
						) {
							fileSha = existingFile.data.sha;
						}
					} catch (err: unknown) {
						if (
							!(err instanceof Error && "status" in err && err.status === 404)
						) {
							throw err;
						}
						// File doesn't exist, that's fine for creation
					}

					const base64Content = Buffer.from(content, "utf-8").toString(
						"base64",
					);

					await octokit.repos.createOrUpdateFileContents({
						owner,
						repo,
						path,
						message: commitMessage,
						content: base64Content,
						branch,
						sha: fileSha,
					});

					const fileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
					return {
						success: true,
						output:
							fileSha !== undefined
								? `File updated: ${path}`
								: `File created: ${path}`,
						url: fileUrl,
					};
				} catch (err: unknown) {
					return {
						success: false,
						error: err instanceof Error ? err.message : "Failed to write file",
					};
				}
			},
		}),

		create_branch: tool({
			description:
				"Create a new branch from the base branch. Branch names must follow the scaffolder/* convention.",
			inputSchema: zodSchema(
				z.object({
					branchName: z
						.string()
						.describe(
							"Name for the new branch (e.g., 'scaffolder/add-user-auth')",
						),
				}),
			),
			execute: async ({ branchName }): Promise<IToolResult> => {
				// Enforce scaffolder branch naming
				if (!branchName.startsWith("scaffolder/")) {
					return {
						success: false,
						error:
							"Branch name must start with 'scaffolder/' (e.g., scaffolder/add-login-feature)",
					};
				}

				try {
					// Get the SHA of the base branch
					const baseBranchRef = await octokit.git.getRef({
						owner,
						repo,
						ref: `heads/${baseBranch}`,
					});

					const baseSha = baseBranchRef.data.object.sha;

					// Create the new branch
					await octokit.git.createRef({
						owner,
						repo,
						ref: `refs/heads/${branchName}`,
						sha: baseSha,
					});

					return {
						success: true,
						output: `Branch '${branchName}' created from '${baseBranch}'`,
						url: `https://github.com/${owner}/${repo}/tree/${branchName}`,
					};
				} catch (err: unknown) {
					if (err instanceof Error && "status" in err && err.status === 422) {
						return {
							success: false,
							error: `Branch '${branchName}' already exists`,
						};
					}
					return {
						success: false,
						error:
							err instanceof Error ? err.message : "Failed to create branch",
					};
				}
			},
		}),

		create_pull_request: tool({
			description:
				"Create a pull request to merge changes from a scaffolder branch into the base branch.",
			inputSchema: zodSchema(
				z.object({
					title: z.string().describe("Title of the pull request"),
					body: z
						.string()
						.describe("Description of the changes in the pull request"),
					branch: z
						.string()
						.describe("Source branch name (must be a scaffolder/* branch)"),
				}),
			),
			execute: async ({ title, body, branch }): Promise<IToolResult> => {
				// Enforce scaffolder branch naming
				if (!branch.startsWith("scaffolder/")) {
					return {
						success: false,
						error:
							"Branch name must start with 'scaffolder/' (e.g., scaffolder/add-login-feature)",
					};
				}

				try {
					const pr = await octokit.pulls.create({
						owner,
						repo,
						title,
						body,
						head: branch,
						base: baseBranch,
					});

					return {
						success: true,
						output: `Pull request #${String(pr.data.number)} created: ${title}`,
						url: pr.data.html_url,
					};
				} catch (err: unknown) {
					// If API fails (permission issue), provide manual PR creation URL
					const manualPrUrl = `https://github.com/${owner}/${repo}/compare/${baseBranch}...${branch}?expand=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

					const errorMsg =
						err instanceof Error
							? err.message
							: "Failed to create pull request";

					// Check if it's a permission error
					if (
						errorMsg.includes("Resource not accessible") ||
						errorMsg.includes("403")
					) {
						return {
							success: false,
							error: `PR API not available. Create manually: ${manualPrUrl}`,
							url: manualPrUrl,
						};
					}

					return {
						success: false,
						error: errorMsg,
						url: manualPrUrl,
					};
				}
			},
		}),

		list_directory: tool({
			description:
				"List files and directories at a given path in the repository.",
			inputSchema: zodSchema(
				z.object({
					path: z
						.string()
						.optional()
						.describe(
							"Path to list (defaults to root). Use '' or '.' for root.",
						),
					branch: z
						.string()
						.optional()
						.describe("Branch to list from (defaults to base branch)"),
				}),
			),
			execute: async ({ path, branch }): Promise<IToolResult> => {
				try {
					const targetPath = path === "." || path === "" ? "" : (path ?? "");
					const response = await octokit.repos.getContent({
						owner,
						repo,
						path: targetPath,
						ref: branch ?? baseBranch,
					});

					if (!Array.isArray(response.data)) {
						return {
							success: false,
							error: `Path '${targetPath || "/"}' is a file, not a directory`,
						};
					}

					const listing = response.data
						.map((item) => `${item.type === "dir" ? "📁" : "📄"} ${item.name}`)
						.join("\n");

					return {
						success: true,
						output: listing || "(empty directory)",
					};
				} catch (err: unknown) {
					if (err instanceof Error && "status" in err && err.status === 404) {
						return {
							success: false,
							error: `Directory not found: ${path ?? "/"}`,
						};
					}
					return {
						success: false,
						error:
							err instanceof Error ? err.message : "Failed to list directory",
					};
				}
			},
		}),

		get_repository_info: tool({
			description:
				"Get information about the repository including default branch, description, and recent activity.",
			inputSchema: zodSchema(z.object({})),
			execute: async (): Promise<IToolResult> => {
				try {
					const repoInfo = await octokit.repos.get({
						owner,
						repo,
					});

					const info = [
						`Repository: ${repoInfo.data.full_name}`,
						`Default branch: ${repoInfo.data.default_branch}`,
						`Description: ${repoInfo.data.description ?? "(none)"}`,
						`Language: ${repoInfo.data.language ?? "Unknown"}`,
						`Private: ${repoInfo.data.private ? "Yes" : "No"}`,
						`URL: ${repoInfo.data.html_url}`,
					].join("\n");

					return {
						success: true,
						output: info,
					};
				} catch (err: unknown) {
					return {
						success: false,
						error:
							err instanceof Error
								? err.message
								: "Failed to get repository info",
					};
				}
			},
		}),
	};
}
