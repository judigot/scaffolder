import { getApiUrl } from "@/utils/getApiUrl.ts";

const trimTrailingSlashes = (value: string): string => {
	return value.replace(/\/+$/, "");
};

export const getTerminalApiUrl = (): string => {
	const terminalUrl = String(
		import.meta.env.VITE_TERMINAL_API_URL ?? "",
	).trim();
	if (terminalUrl) {
		return trimTrailingSlashes(terminalUrl);
	}

	return getApiUrl();
};
