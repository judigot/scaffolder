/**
 * Environment variable parser/serializer for infrastructure credentials
 * and user environment variables.
 *
 * Supports standard .env format:
 * - KEY=VALUE pairs (one per line)
 * - Lines starting with # are comments (ignored)
 * - Empty lines are ignored
 * - Values can be quoted with single or double quotes
 * - Inline comments after values (with space + #) are stripped
 * - Multi-line values with quotes are supported
 */

/** Mapping from .env variable names to IInfraCredentials field names */
export const INFRA_ENV_MAP: Record<string, string> = {
	SSH_PUBLIC_KEY: "sshPublicKey",
	SSH_PRIVATE_KEY: "sshPrivateKey",
	AWS_ACCESS_KEY_ID: "awsAccessKeyId",
	AWS_SECRET_ACCESS_KEY: "awsSecretAccessKey",
	AWS_SESSION_TOKEN: "awsSessionToken",
	TFC_TOKEN: "tfcToken",
	TFC_ORG: "tfcOrg",
	TFC_WORKSPACE: "tfcWorkspace",
};

/** Reverse mapping: field name → env var name */
export const INFRA_FIELD_TO_ENV: Record<string, string> = Object.fromEntries(
	Object.entries(INFRA_ENV_MAP).map(([envName, field]) => [field, envName]),
);

interface IParsedEnvEntry {
	key: string;
	value: string;
}

/**
 * Parse a .env format string into key-value pairs.
 * Handles comments, empty lines, quoted values, and multi-line values.
 */
export function parseEnvString(text: string): IParsedEnvEntry[] {
	if (typeof text !== "string" || text.trim() === "") {
		return [];
	}

	const results: IParsedEnvEntry[] = [];
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	let i = 0;

	while (i < lines.length) {
		const line = lines[i].trim();
		i++;

		// Skip empty lines and comments
		if (line === "" || line.startsWith("#")) {
			continue;
		}

		// Must contain = to be a valid env entry
		const eqIndex = line.indexOf("=");
		if (eqIndex === -1) {
			continue;
		}

		const key = line.substring(0, eqIndex).trim();
		if (key === "") {
			continue;
		}

		let rawValue = line.substring(eqIndex + 1);

		// Check for quoted multi-line values
		const trimmedValue = rawValue.trim();
		if (
			(trimmedValue.startsWith('"') && !trimmedValue.endsWith('"')) ||
			(trimmedValue.startsWith("'") && !trimmedValue.endsWith("'"))
		) {
			const quote = trimmedValue[0];
			// Collect multi-line value
			let multiLineValue = trimmedValue.substring(1);
			while (i < lines.length) {
				const nextLine = lines[i];
				i++;
				if (nextLine.trimEnd().endsWith(quote)) {
					multiLineValue +=
						"\n" + nextLine.trimEnd().slice(0, -1);
					break;
				}
				multiLineValue += "\n" + nextLine;
			}
			results.push({ key, value: multiLineValue });
			continue;
		}

		// Handle quoted values (single line)
		if (
			(trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
			(trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
		) {
			rawValue = trimmedValue.slice(1, -1);
		} else {
			// Strip inline comments (space + #)
			const commentIndex = rawValue.indexOf(" #");
			if (commentIndex !== -1) {
				rawValue = rawValue.substring(0, commentIndex);
			}
			rawValue = rawValue.trim();
		}

		results.push({ key, value: rawValue });
	}

	return results;
}

/**
 * Parse .env format and map matching keys to infra credential fields.
 * Returns a partial record of field → value for matched entries,
 * plus a count of matched/unmatched.
 */
export function parseInfraFromEnv(text: string): {
	fields: Record<string, string>;
	matchedCount: number;
	unmatchedKeys: string[];
} {
	const entries = parseEnvString(text);
	const fields: Record<string, string> = {};
	const unmatchedKeys: string[] = [];
	let matchedCount = 0;

	for (const entry of entries) {
		const fieldName = INFRA_ENV_MAP[entry.key];
		if (fieldName) {
			fields[fieldName] = entry.value;
			matchedCount++;
		} else {
			unmatchedKeys.push(entry.key);
		}
	}

	return { fields, matchedCount, unmatchedKeys };
}

/**
 * Serialize infra credentials to a .env format string.
 * Only includes non-empty values.
 */
export function serializeInfraToEnv(
	credentials: Record<string, string>,
): string {
	const lines: string[] = [];

	// Group by category for readability
	const groups = [
		{
			label: "SSH",
			fields: ["sshPublicKey", "sshPrivateKey"],
		},
		{
			label: "AWS",
			fields: ["awsAccessKeyId", "awsSecretAccessKey", "awsSessionToken"],
		},
		{
			label: "Terraform Cloud",
			fields: ["tfcToken", "tfcOrg", "tfcWorkspace"],
		},
	];

	for (const group of groups) {
		const groupLines: string[] = [];
		for (const field of group.fields) {
			const value = credentials[field];
			if (value && value.trim() !== "") {
				const envName = INFRA_FIELD_TO_ENV[field];
				if (envName) {
					// Quote values that contain newlines, spaces, or special chars
					const needsQuotes =
						value.includes("\n") ||
						value.includes(" ") ||
						value.includes("#") ||
						value.includes('"');
					const quotedValue = needsQuotes
						? `"${value.replace(/"/g, '\\"')}"`
						: value;
					groupLines.push(`${envName}=${quotedValue}`);
				}
			}
		}
		if (groupLines.length > 0) {
			if (lines.length > 0) {
				lines.push("");
			}
			lines.push(`# ${group.label}`);
			lines.push(...groupLines);
		}
	}

	return lines.join("\n");
}

/**
 * Serialize environment variable entries to .env format string.
 * Only includes entries with non-empty keys.
 */
export function serializeEnvEntries(
	entries: { key: string; value: string }[],
): string {
	return entries
		.filter((e) => e.key.trim() !== "")
		.map((e) => {
			const value = e.value;
			const needsQuotes =
				value.includes("\n") ||
				value.includes(" ") ||
				value.includes("#") ||
				value.includes('"');
			const quotedValue = needsQuotes
				? `"${value.replace(/"/g, '\\"')}"`
				: value;
			return `${e.key.trim()}=${quotedValue}`;
		})
		.join("\n");
}
