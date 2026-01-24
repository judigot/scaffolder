import { Hono } from "hono";
import { validateAwsCredentials } from "@/app/services/awsCredentialValidator.ts";
import {
	type ITerraformConfig,
	createTerraformConfigFromCredentials,
	createTerraformRun,
	getTerraformOutputs,
	getTerraformRun,
	getTerraformWorkspaceId,
	getTerraformWorkspaceVariables,
	upsertTerraformVariables,
	validateTerraformConfig,
} from "@/app/services/terraformCloudService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

interface ITerraformRunPayload {
	enableEc2?: unknown;
	awsAccessKeyId?: unknown;
	awsSecretAccessKey?: unknown;
	awsSessionToken?: unknown;
	sshPublicKey?: unknown;
	tfcToken?: unknown;
	tfcOrg?: unknown;
	tfcWorkspace?: unknown;
}

interface ITerraformStatusPayload {
	tfcToken?: unknown;
	tfcOrg?: unknown;
	tfcWorkspace?: unknown;
}

interface ITerraformRunIdPayload {
	tfcToken?: unknown;
	tfcOrg?: unknown;
	tfcWorkspace?: unknown;
}

const extractTfcConfig = (body: {
	tfcToken?: unknown;
	tfcOrg?: unknown;
	tfcWorkspace?: unknown;
}): ITerraformConfig | null => {
	if (
		typeof body.tfcToken !== "string" ||
		typeof body.tfcOrg !== "string" ||
		typeof body.tfcWorkspace !== "string"
	) {
		return null;
	}
	return createTerraformConfigFromCredentials({
		tfcToken: body.tfcToken,
		tfcOrg: body.tfcOrg,
		tfcWorkspace: body.tfcWorkspace,
	});
};

const router = new Hono();

router.post("/status", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const body = await c.req.json<ITerraformStatusPayload>();
	const config = extractTfcConfig(body);

	if (config === null) {
		return c.json(
			{
				error: "Missing Terraform Cloud credentials",
				message:
					"tfcToken, tfcOrg, and tfcWorkspace are required. Add them in your profile.",
			},
			400,
		);
	}

	try {
		validateTerraformConfig(config);
		await getTerraformWorkspaceId(config);

		const variables = await getTerraformWorkspaceVariables(config);
		const enableVar = variables.find(
			(item) => item.category === "env" && item.key === "TF_VAR_enable_ec2",
		);
		const outputs = await getTerraformOutputs(config);
		const enableEc2 = enableVar?.value === "true";
		return c.json(
			{
				success: true,
				enableEc2,
				outputs,
			},
			200,
		);
	} catch (error: unknown) {
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to fetch Terraform status",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to fetch Terraform status",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

router.post("/run", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const body = await c.req.json<ITerraformRunPayload>();

	const config = extractTfcConfig(body);

	if (config === null) {
		return c.json(
			{
				error: "Missing Terraform Cloud credentials",
				message:
					"tfcToken, tfcOrg, and tfcWorkspace are required. Add them in your profile.",
			},
			400,
		);
	}

	if (typeof body.enableEc2 !== "boolean") {
		return c.json(
			{
				error: "Invalid payload",
				message: "enableEc2 must be a boolean.",
			},
			400,
		);
	}

	if (
		typeof body.awsAccessKeyId !== "string" ||
		typeof body.awsSecretAccessKey !== "string" ||
		typeof body.sshPublicKey !== "string"
	) {
		return c.json(
			{
				error: "Invalid payload",
				message:
					"awsAccessKeyId, awsSecretAccessKey, and sshPublicKey are required.",
			},
			400,
		);
	}

	try {
		validateTerraformConfig(config);

		const awsValidation = await validateAwsCredentials({
			accessKeyId: body.awsAccessKeyId,
			secretAccessKey: body.awsSecretAccessKey,
			sessionToken:
				typeof body.awsSessionToken === "string" &&
				body.awsSessionToken.trim() !== ""
					? body.awsSessionToken
					: undefined,
		});

		if (!awsValidation.valid) {
			return c.json(
				{
					error: "Invalid AWS credentials",
					message:
						awsValidation.error ??
						"AWS credentials are invalid. Update them in your profile.",
				},
				422,
			);
		}

		await getTerraformWorkspaceId(config);

		const variables = [
			{
				key: "AWS_ACCESS_KEY_ID",
				value: body.awsAccessKeyId,
				category: "env" as const,
				sensitive: true,
			},
			{
				key: "AWS_SECRET_ACCESS_KEY",
				value: body.awsSecretAccessKey,
				category: "env" as const,
				sensitive: true,
			},
			{
				key: "TF_VAR_ssh_public_key",
				value: body.sshPublicKey,
				category: "env" as const,
				sensitive: true,
			},
			{
				key: "TF_VAR_enable_ec2",
				value: body.enableEc2 ? "true" : "false",
				category: "env" as const,
				sensitive: false,
			},
		];

		if (
			typeof body.awsSessionToken === "string" &&
			body.awsSessionToken.trim() !== ""
		) {
			variables.push({
				key: "AWS_SESSION_TOKEN",
				value: body.awsSessionToken,
				category: "env" as const,
				sensitive: true,
			});
		}

		await upsertTerraformVariables(config, variables);
		const run = await createTerraformRun(
			config,
			`App toggle: enable_ec2 ${body.enableEc2 ? "true" : "false"}`,
		);

		return c.json(
			{
				success: true,
				run,
			},
			200,
		);
	} catch (error: unknown) {
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to trigger Terraform run",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to trigger Terraform run",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

router.post("/run/:runId", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const runId = c.req.param("runId");
	if (runId === "") {
		return c.json(
			{
				error: "Run ID is required",
			},
			400,
		);
	}

	const body = await c.req.json<ITerraformRunIdPayload>();
	const config = extractTfcConfig(body);

	if (config === null) {
		return c.json(
			{
				error: "Missing Terraform Cloud credentials",
				message:
					"tfcToken, tfcOrg, and tfcWorkspace are required.",
			},
			400,
		);
	}

	try {
		const run = await getTerraformRun(config, runId);
		return c.json(
			{
				success: true,
				run,
			},
			200,
		);
	} catch (error: unknown) {
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to fetch Terraform run",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to fetch Terraform run",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

export default router;
