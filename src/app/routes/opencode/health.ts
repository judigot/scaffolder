import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	buildOpencodeHeaders,
	getOpencodeConfig,
} from "@/app/services/opencodeService.ts";

const app = new Hono();

app.use("*", cors());

app.get("/", async (c) => {
	const configResult = getOpencodeConfig();
	if (!configResult.ok) {
		return c.json(
			{
				connected: false,
				error: configResult.error,
			},
			{ status: configResult.status },
		);
	}

	const { config } = configResult;
	const url = new URL("/global/health", config.baseUrl);

	try {
		const response = await fetch(url.toString(), {
			headers: buildOpencodeHeaders(config),
		});

		if (!response.ok) {
			const text = await response.text();
			return c.json(
				{
					connected: false,
					error: `OpenCode health check failed (${String(response.status)})`,
					details: text,
				},
				502,
			);
		}

		const data: unknown = await response.json();
		let version = "unknown";
		if (
			typeof data === "object" &&
			data !== null &&
			"version" in data &&
			typeof data.version === "string"
		) {
			version = data.version;
		}
		return c.json({
			connected: true,
			version,
			url: config.baseUrl,
			directory: config.defaultDirectory ?? "",
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to reach OpenCode";
		return c.json(
			{
				connected: false,
				error: message,
			},
			502,
		);
	}
});

export default app;
