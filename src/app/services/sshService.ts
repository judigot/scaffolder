import { Client } from "ssh2";

interface ISSHConnectionOptions {
	host: string;
	privateKey: string;
	username?: string;
	port?: number;
	connectionTimeout?: number;
}

interface ICommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

const DEFAULT_USERNAME = "ubuntu";
const DEFAULT_PORT = 22;
const DEFAULT_CONNECTION_TIMEOUT = 10_000;
const DEFAULT_COMMAND_TIMEOUT = 60_000;

export function connectToInstance(
	options: ISSHConnectionOptions,
): Promise<Client> {
	const {
		host,
		privateKey,
		username = DEFAULT_USERNAME,
		port = DEFAULT_PORT,
		connectionTimeout = DEFAULT_CONNECTION_TIMEOUT,
	} = options;

	return new Promise<Client>((resolve, reject) => {
		const client = new Client();
		const timeout = setTimeout(() => {
			client.end();
			reject(new Error("SSH connection timed out"));
		}, connectionTimeout);

		client
			.on("ready", () => {
				clearTimeout(timeout);
				resolve(client);
			})
			.on("error", (err: Error) => {
				clearTimeout(timeout);
				reject(new Error(`SSH connection failed: ${err.message}`));
			})
			.connect({
				host,
				port,
				username,
				privateKey,
				readyTimeout: connectionTimeout,
			});
	});
}

export function executeCommand(
	client: Client,
	command: string,
	timeout: number = DEFAULT_COMMAND_TIMEOUT,
): Promise<ICommandResult> {
	return new Promise<ICommandResult>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Command timed out after ${String(timeout)}ms`));
		}, timeout);

		client.exec(command, (err, stream) => {
			if (err) {
				clearTimeout(timer);
				reject(new Error(`Command execution failed: ${err.message}`));
				return;
			}

			let stdout = "";
			let stderr = "";

			stream
				.on("close", (code: number) => {
					clearTimeout(timer);
					resolve({ stdout, stderr, exitCode: code ?? 0 });
				})
				.on("data", (data: Buffer) => {
					stdout += data.toString();
				})
				.stderr.on("data", (data: Buffer) => {
					stderr += data.toString();
				});
		});
	});
}

export async function readFile(
	client: Client,
	path: string,
): Promise<ICommandResult> {
	return await executeCommand(client, `cat ${escapeShellArg(path)}`);
}

export async function writeFile(
	client: Client,
	path: string,
	content: string,
): Promise<ICommandResult> {
	const escapedPath = escapeShellArg(path);
	const escapedContent = content.replace(/'/g, "'\\''");
	const command = `mkdir -p "$(dirname ${escapedPath})" && printf '%s' '${escapedContent}' > ${escapedPath}`;
	return await executeCommand(client, command);
}

export async function listDirectory(
	client: Client,
	path: string,
): Promise<ICommandResult> {
	return await executeCommand(
		client,
		`ls -la ${escapeShellArg(path)} 2>/dev/null || echo "Directory not found: ${path}"`,
	);
}

export function disconnect(client: Client): void {
	client.end();
}

function escapeShellArg(arg: string): string {
	return `'${arg.replace(/'/g, "'\\''")}'`;
}
