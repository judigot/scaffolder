import type {
	IScaffolderMessage,
	ScaffolderMessageCode,
	ScaffolderSeverity,
} from "@/interfaces/scaffolderMessages.ts";

const severityIcons: Record<ScaffolderSeverity, string> = {
	error: "❌",
	warning: "⚠️",
	info: "ℹ️",
};

let messageCounter = 0;

export interface ICreateScaffolderMessageParams {
	code: ScaffolderMessageCode;
	title: string;
	severity: ScaffolderSeverity;
	details?: string[];
	suggestion?: string;
	file?: string;
	line?: number;
	dismissible?: boolean;
}

export const createScaffolderMessage = (
	params: ICreateScaffolderMessageParams,
): IScaffolderMessage => {
	const timestamp = new Date().toISOString();
	return {
		id: `scaffolder-${params.code}-${timestamp}-${String(messageCounter++)}`,
		code: params.code,
		title: params.title,
		severity: params.severity,
		details: params.details ?? [],
		suggestion: params.suggestion,
		file: params.file,
		line: params.line,
		dismissible: params.dismissible ?? params.severity !== "error",
		timestamp,
	};
};

export const formatMessagesAsMarkdown = (
	messages: IScaffolderMessage[],
): string => {
	if (messages.length === 0) {
		return "# Scaffolder Messages\n\nNo messages to report.";
	}

	const grouped: Record<ScaffolderSeverity, IScaffolderMessage[]> = {
		error: [],
		warning: [],
		info: [],
	};
	for (const message of messages) {
		grouped[message.severity].push(message);
	}

	const lines: string[] = ["# Scaffolder Messages"];

	const severityOrder: ScaffolderSeverity[] = ["error", "warning", "info"];

	for (const severity of severityOrder) {
		const entries = grouped[severity];
		if (entries.length === 0) {
			continue;
		}
		lines.push(`\n## ${severity.toUpperCase()}`);
		for (const message of entries) {
			lines.push(
				`\n### ${severityIcons[severity]} ${message.code} · ${message.title}`,
			);
			lines.push(`- Timestamp: ${message.timestamp}`);
			if (message.file !== undefined && message.file !== "") {
				lines.push(`- File: ${message.file}`);
			}
			if (message.line !== undefined) {
				lines.push(`- Line: ${String(message.line)}`);
			}
			for (const detail of message.details ?? []) {
				lines.push(`- ${detail}`);
			}
			if (message.suggestion !== undefined && message.suggestion !== "") {
				lines.push(`- Suggestion: ${message.suggestion}`);
			}
			lines.push(`- Dismissible: ${message.dismissible ? "Yes" : "No"}`);
		}
	}

	return lines.join("\n");
};

const formatSeverityTitle = (severity: ScaffolderSeverity): string => {
	if (severity === "error") {
		return "# Scaffolder Errors";
	}
	if (severity === "warning") {
		return "# Scaffolder Warnings";
	}
	return "# Scaffolder Info";
};

export const formatMessagesBySeverity = (
	messages: IScaffolderMessage[],
	severity: ScaffolderSeverity,
): string => {
	const scoped = messages.filter((message) => message.severity === severity);
	if (scoped.length === 0) {
		return `${formatSeverityTitle(severity)}\n\nNo messages to report.`;
	}

	const lines: string[] = [formatSeverityTitle(severity)];
	for (const message of scoped) {
		lines.push(`\n## ${message.code} · ${message.title}`);
		lines.push(`- Timestamp: ${message.timestamp}`);
		if (message.file !== undefined && message.file !== "") {
			lines.push(`- File: ${message.file}`);
		}
		if (message.line !== undefined) {
			lines.push(`- Line: ${String(message.line)}`);
		}
		for (const detail of message.details ?? []) {
			lines.push(`- ${detail}`);
		}
		if (message.suggestion !== undefined && message.suggestion !== "") {
			lines.push(`- Suggestion: ${message.suggestion}`);
		}
	}

	return lines.join("\n");
};

export const formatMessagesAsJson = (
	messages: IScaffolderMessage[],
): string => {
	const payload = groupMessagesBySeverity(messages);
	return JSON.stringify(payload, null, 2);
};

export const groupMessagesBySeverity = (
	messages: IScaffolderMessage[],
): {
	errors: IScaffolderMessage[];
	warnings: IScaffolderMessage[];
	info: IScaffolderMessage[];
} => {
	return {
		errors: messages.filter((message) => message.severity === "error"),
		warnings: messages.filter((message) => message.severity === "warning"),
		info: messages.filter((message) => message.severity === "info"),
	};
};
