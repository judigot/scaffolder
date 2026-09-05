import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	validateSchemaInfo,
	parseAndValidateSchemaInfo,
	extractSchemaInfoFromResponse,
	type SchemaInfo,
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
		const body: unknown = await c.req.json();

		if (typeof body !== 'object' || body === null || !('schemaInfo' in body)) {
			return c.json({ error: "schemaInfo is required" }, 400);
		}

		interface IRequestBody {
			schemaInfo: unknown;
		}

		function isRequestBody(obj: object): obj is IRequestBody {
			return 'schemaInfo' in obj;
		}

		if (!isRequestBody(body)) {
			return c.json({ error: "schemaInfo is required" }, 400);
		}

		const { schemaInfo } = body;

		const result = validateSchemaInfo(schemaInfo);

		if (result.success) {
			return c.json({
				valid: true,
				message: "Schema is valid",
				tableCount: result.data?.length ?? 0,
				tables: result.data?.map((t: SchemaInfo) => t.tableName) ?? [],
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
		const body: unknown = await c.req.json();

		if (typeof body !== 'object' || body === null || !('json' in body)) {
			return c.json({ error: "json string is required" }, 400);
		}

		interface IRequestBody {
			json: unknown;
		}

		function isRequestBody(obj: object): obj is IRequestBody {
			return 'json' in obj;
		}

		if (!isRequestBody(body)) {
			return c.json({ error: "json string is required" }, 400);
		}

		const { json } = body;

		if (typeof json !== "string" || json.length === 0) {
			return c.json({ error: "json string is required" }, 400);
		}

		const result = parseAndValidateSchemaInfo(json);

		if (result.success) {
			return c.json({
				valid: true,
				message: "Schema is valid",
				tableCount: result.data?.length ?? 0,
				tables: result.data?.map((t: SchemaInfo) => t.tableName) ?? [],
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
		const body: unknown = await c.req.json();

		if (typeof body !== 'object' || body === null || !('responseText' in body)) {
			return c.json({ error: "responseText is required" }, 400);
		}

		interface IRequestBody {
			responseText: unknown;
		}

		function isRequestBody(obj: object): obj is IRequestBody {
			return 'responseText' in obj;
		}

		if (!isRequestBody(body)) {
			return c.json({ error: "responseText is required" }, 400);
		}

		const { responseText } = body;

		if (typeof responseText !== "string" || responseText.length === 0) {
			return c.json({ error: "responseText is required" }, 400);
		}

		const extracted = extractSchemaInfoFromResponse(responseText);

		if (extracted === null) {
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
				tables: result.data?.map((t: SchemaInfo) => t.tableName) ?? [],
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
