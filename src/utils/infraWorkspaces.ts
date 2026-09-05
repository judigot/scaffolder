export const normalizeWorkspaceList = (workspaces: string[]): string[] => {
	const seen = new Set<string>();
	const normalized: string[] = [];
	for (const workspace of workspaces) {
		const trimmed = workspace.trim();
		if (trimmed === "") {
			continue;
		}
		if (seen.has(trimmed)) {
			continue;
		}
		seen.add(trimmed);
		normalized.push(trimmed);
	}
	return normalized;
};

export const parseWorkspaceValue = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return normalizeWorkspaceList(
			value.filter((item): item is string => typeof item === "string"),
		);
	}
	if (typeof value !== "string") {
		return [];
	}
	const trimmed = value.trim();
	if (trimmed === "") {
		return [];
	}
	try {
		const parsed = JSON.parse(trimmed) as unknown;
		if (Array.isArray(parsed)) {
			return normalizeWorkspaceList(
				parsed.filter((item): item is string => typeof item === "string"),
			);
		}
		if (typeof parsed === "string") {
			return normalizeWorkspaceList([parsed]);
		}
	} catch {
		return normalizeWorkspaceList([trimmed]);
	}
	return normalizeWorkspaceList([trimmed]);
};
