type OpencodeConfig = {
	baseUrl: string;
	username?: string;
	password?: string;
	defaultDirectory?: string;
	allowRemote: boolean;
};

type OpencodeConfigResult =
	| { ok: true; config: OpencodeConfig }
	| { ok: false; error: string; status: 403 | 500 };

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function normalizeDirectory(directory?: string): string | undefined {
	if (!directory || directory.trim() === "") {
		return undefined;
	}

	const trimmed = directory.trim();
	const isNonAscii = Array.from(trimmed).some(
		(char) => char.charCodeAt(0) > 127,
	);
	return isNonAscii ? encodeURIComponent(trimmed) : trimmed;
}

function isAllowedHost(url: URL, allowRemote: boolean): boolean {
	if (allowRemote) {
		return true;
	}

	return LOCAL_HOSTS.has(url.hostname);
}

export function getOpencodeConfig(): OpencodeConfigResult {
	const baseUrl = process.env.OPENCODE_URL ?? "http://127.0.0.1:4096";
	let parsedUrl: URL;

	try {
		parsedUrl = new URL(baseUrl);
	} catch {
		return { ok: false, error: "Invalid OPENCODE_URL", status: 500 };
	}

	const allowRemote = process.env.OPENCODE_ALLOW_REMOTE === "true";

	if (!isAllowedHost(parsedUrl, allowRemote)) {
		return {
			ok: false,
			error: "OpenCode remote hosts are not allowed",
			status: 403,
		};
	}

	return {
		ok: true,
		config: {
			baseUrl: parsedUrl.toString().replace(/\/$/, ""),
			username: process.env.OPENCODE_SERVER_USERNAME,
			password: process.env.OPENCODE_SERVER_PASSWORD,
			defaultDirectory: process.env.OPENCODE_DIRECTORY,
			allowRemote,
		},
	};
}

export function buildOpencodeHeaders(
	config: OpencodeConfig,
	directory?: string,
): Headers {
	const headers = new Headers();
	headers.set("Content-Type", "application/json");

	if (config.username && config.password) {
		const token = Buffer.from(`${config.username}:${config.password}`).toString(
			"base64",
		);
		headers.set("Authorization", `Basic ${token}`);
	}

	const resolvedDirectory = normalizeDirectory(
		directory ?? config.defaultDirectory,
	);
	if (resolvedDirectory) {
		headers.set("x-opencode-directory", resolvedDirectory);
	}

	return headers;
}

export type { OpencodeConfig };
