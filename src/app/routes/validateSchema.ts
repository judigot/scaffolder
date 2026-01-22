import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	validateSchemaInfo,
	parseAndValidateSchemaInfo,
	extractSchemaInfoFromResponse,
	validateSchemaInfoFromResponse,
} from "@/utils/schemaInfoValidator.ts";

const app = new Hono();

app.use("*", cors());

/**
 * POST /validate
 * Validates a schemaInfo array directly
 * Body: { schemaInfo: ISchemaInfo[] }
 */
app.post("/", async (c) => {
	try {
		const body = await c.req.json();
		const { schemaInfo } = body as { schemaInfo: unknown };

		if (!schemaInfo) {
			return c.json({ error: "schemaInfo is required" }, 400);
		}

		const result = validateSchemaInfo(schemaInfo);

		if (result.success) {
			return c.json({
				valid: true,
				message: "Schema is valid",
				tableCount: result.data?.length ?? 0,
				tables: result.data?.map((t) => t.tableName) ?? [],
			});
		}

		return c.json({
			valid: false,
			message: "Schema validation failed",
			errors: result.errors,
		});
	} catch (error) {
		console.error("Validation error:", error);
		return c.json({ error: "Invalid request body" }, 400);
	}
});

/**
 * POST /validate/json
 * Validates a schemaInfo from a JSON string
 * Body: { json: string }
 */
app.post("/json", async (c) => {
	try {
		const body = await c.req.json();
		const { json } = body as { json: string };

		if (!json || typeof json !== "string") {
			return c.json({ error: "json string is required" }, 400);
		}

		const result = parseAndValidateSchemaInfo(json);

		if (result.success) {
			return c.json({
				valid: true,
				message: "Schema is valid",
				tableCount: result.data?.length ?? 0,
				tables: result.data?.map((t) => t.tableName) ?? [],
				schemaInfo: result.data,
			});
		}

		return c.json({
			valid: false,
			message: "Schema validation failed",
			errors: result.errors,
		});
	} catch (error) {
		console.error("Validation error:", error);
		return c.json({ error: "Invalid request body" }, 400);
	}
});

/**
 * POST /validate/extract
 * Extracts and validates schemaInfo from AI response text
 * Body: { responseText: string }
 */
app.post("/extract", async (c) => {
	try {
		const body = await c.req.json();
		const { responseText } = body as { responseText: string };

		if (!responseText || typeof responseText !== "string") {
			return c.json({ error: "responseText is required" }, 400);
		}

		const extracted = extractSchemaInfoFromResponse(responseText);

		if (!extracted) {
			return c.json({
				valid: false,
				extracted: false,
				message: "No schemaInfo JSON block found in response",
			});
		}

		const result = parseAndValidateSchemaInfo(extracted);

		if (result.success) {
			return c.json({
				valid: true,
				extracted: true,
				message: "Schema extracted and validated successfully",
				tableCount: result.data?.length ?? 0,
				tables: result.data?.map((t) => t.tableName) ?? [],
				schemaInfo: result.data,
			});
		}

		return c.json({
			valid: false,
			extracted: true,
			message: "Schema extraction successful but validation failed",
			errors: result.errors,
			rawJson: extracted,
		});
	} catch (error) {
		console.error("Extraction error:", error);
		return c.json({ error: "Invalid request body" }, 400);
	}
});

export default app;
