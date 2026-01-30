import { randomUUID } from "node:crypto";
import type { Client } from "ssh2";

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

interface ISSH2Connection {
	kind: "ssh2";
	client: Client;
}

interface IBunSshConnection {
	kind: "bun";
	host: string;
	username: string;
	port: number;
	keyPath: string;
}

interface IBunSpawnOptions {
	stdout?: "pipe";
	stderr?: "pipe";
}

interface IBunProcess {
	exited: Promise<number>;
	stdout: { text: () => Promise<string> };
	stderr: { text: () => Promise<string> };
	kill: () => void;
}

interface IBunRuntime {
	spawn: (args: string[], options?: IBunSpawnOptions) => IBunProcess;
	write: (
		path: string,
		data: string,
		options?: { createPath?: boolean },
	) => Promise<void>;
	file: (path: string) => { delete: () => Promise<void> };
}

export type ISSHConnection = ISSH2Connection | IBunSshConnection;

const DEFAULT_USERNAME = "ubuntu";
const DEFAULT_PORT = 22;
const DEFAULT_CONNECTION_TIMEOUT = 10_000;
const DEFAULT_COMMAND_TIMEOUT = 60_000;

let cachedSsh2: typeof import("ssh2") | null = null;

export async function connectToInstance(
	options: ISSHConnectionOptions,
): Promise<ISSHConnection> {
	const {
		host,
		privateKey,
		username = DEFAULT_USERNAME,
		port = DEFAULT_PORT,
		connectionTimeout = DEFAULT_CONNECTION_TIMEOUT,
	} = options;

	const bun = getBunRuntime();
	if (bun !== null) {
		const keyPath = await writePrivateKey(bun, privateKey);
		return {
			kind: "bun",
			host,
			username,
			port,
			keyPath,
		};
	}

	const { Client } = await loadSsh2();

	return new Promise<ISSHConnection>((resolve, reject) => {
		const client = new Client();
		const timeout = setTimeout(() => {
			client.end();
			reject(new Error("SSH connection timed out"));
		}, connectionTimeout);

		client
			.on("ready", () => {
				clearTimeout(timeout);
				resolve({ kind: "ssh2", client });
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

export async function disconnect(connection: ISSHConnection): Promise<void> {
	if (connection.kind === "bun") {
		const bun = getBunRuntime();
		if (bun === null) {
			return;
		}
		await removePrivateKey(bun, connection.keyPath);
		return;
	}

	connection.client.end();
}

export async function executeCommand(
	connection: ISSHConnection,
	command: string,
	timeout: number = DEFAULT_COMMAND_TIMEOUT,
): Promise<ICommandResult> {
	if (connection.kind === "bun") {
		const bun = getBunRuntime();
		if (bun === null) {
			throw new Error("Bun runtime is not available");
		}
		return await executeCommandWithBun(bun, connection, command, timeout);
	}

	return await executeCommandWithSsh2(connection.client, command, timeout);
}

export async function readFile(
	connection: ISSHConnection,
	path: string,
): Promise<ICommandResult> {
	return await executeCommand(connection, `cat ${escapeShellArg(path)}`);
}

export async function writeFile(
	connection: ISSHConnection,
	path: string,
	content: string,
): Promise<ICommandResult> {
	const escapedPath = escapeShellArg(path);
	const escapedContent = content.replace(/'/g, "'\\''");
	const command = `mkdir -p "$(dirname ${escapedPath})" && printf '%s' '${escapedContent}' > ${escapedPath}`;
	return await executeCommand(connection, command);
}

export async function listDirectory(
	connection: ISSHConnection,
	path: string,
): Promise<ICommandResult> {
	return await executeCommand(
		connection,
		`ls -la ${escapeShellArg(path)} 2>/dev/null || echo "Directory not found: ${path}"`,
	);
}

function escapeShellArg(arg: string): string {
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function executeCommandWithSsh2(
	client: Client,
	command: string,
	timeout: number,
): Promise<ICommandResult> {
	return await new Promise<ICommandResult>((resolve, reject) => {
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
					resolve({ stdout, stderr, exitCode: code });
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

async function executeCommandWithBun(
	bun: IBunRuntime,
	connection: IBunSshConnection,
	command: string,
	timeout: number,
): Promise<ICommandResult> {
	const args = [
		"ssh",
		"-i",
		connection.keyPath,
		"-o",
		"BatchMode=yes",
		"-o",
		"StrictHostKeyChecking=no",
		"-o",
		"UserKnownHostsFile=/dev/null",
		"-p",
		String(connection.port),
		`${connection.username}@${connection.host}`,
		command,
	];

	const proc = bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
	const timeoutId = setTimeout(() => {
		proc.kill();
	}, timeout);

	const [exitCode, stdout, stderr] = await Promise.all([
		proc.exited,
		proc.stdout.text(),
		proc.stderr.text(),
	]);

	clearTimeout(timeoutId);

	return {
		exitCode,
		stdout: stdout !== "" ? stdout : "",
		stderr: stderr !== "" ? stderr : "",
	};
}

async function loadSsh2(): Promise<typeof import("ssh2")> {
	if (cachedSsh2 !== null) {
		return cachedSsh2;
	}

	cachedSsh2 = await import("ssh2");
	return cachedSsh2;
}

function hasBunRuntimeMethods(
	value: Record<string, unknown>,
): value is Record<string, unknown> & { spawn: unknown; write: unknown } {
	return typeof value.spawn === "function" && typeof value.write === "function";
}

function isBunRuntime(value: unknown): value is IBunRuntime {
	if (
		typeof value !== "object" ||
		value === null ||
		!("spawn" in value) ||
		!("write" in value)
	) {
		return false;
	}
	// eslint-disable-next-line no-type-assertion/no-type-assertion
	const record = value as Record<string, unknown>;
	return hasBunRuntimeMethods(record);
}

function getGlobalAsRecord(): Record<string, unknown> {
	// eslint-disable-next-line no-type-assertion/no-type-assertion
	return globalThis as unknown as Record<string, unknown>;
}

function getBunRuntime(): IBunRuntime | null {
	const g = getGlobalAsRecord();
	if (!("Bun" in g)) {
		return null;
	}
	const maybeBun = g.Bun;
	if (
		maybeBun === null ||
		maybeBun === undefined ||
		typeof maybeBun !== "object"
	) {
		return null;
	}

	if (!isBunRuntime(maybeBun)) {
		return null;
	}

	return maybeBun;
}

async function writePrivateKey(
	bun: IBunRuntime,
	privateKey: string,
): Promise<string> {
	const keyPath = `/tmp/scaffolder-ssh-key-${randomUUID()}`;
	await bun.write(keyPath, privateKey, { createPath: true });
	const chmod = bun.spawn(["chmod", "600", keyPath]);
	await chmod.exited;
	return keyPath;
}

async function removePrivateKey(
	bun: IBunRuntime,
	keyPath: string,
): Promise<void> {
	try {
		await bun.file(keyPath).delete();
	} catch {
		return;
	}
}
