import { Hono } from "hono";
import {
	Auth0ManagementApiNotConfiguredError,
	getUserMetadata,
	isAuth0ManagementApiConfigured,
	updateUserMetadata,
} from "@/app/services/auth0Service.ts";
import { isRecord } from "@/utils/typeGuards.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

const router = new Hono();

router.get("/", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const auth0UserId = verification.auth0UserId;

	if (auth0UserId === "") {
		return c.json({ error: "User ID not found in token" }, 401);
	}

	try {
		const metadata = await getUserMetadata(auth0UserId);
		const isConfigured = isAuth0ManagementApiConfigured();

		return c.json({
			success: true,
			metadata: metadata ?? null,
			serverConfigStatus: {
				auth0ManagementApiConfigured: isConfigured,
			},
		});
	} catch (error: unknown) {
		if (error instanceof Auth0ManagementApiNotConfiguredError) {
			return c.json(
				{
					error: "Auth0 Management API not configured",
					message: error.message,
					code: "AUTH0_MANAGEMENT_API_NOT_CONFIGURED",
				},
				500,
			);
		}
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to get user metadata",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to get user metadata",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

interface IEnvVariablePayload {
	envVariables?: { key?: unknown; value?: unknown }[];
}

interface IInfraPayload {
	infra?: {
		sshPublicKey?: unknown;
		awsAccessKeyId?: unknown;
		awsSecretAccessKey?: unknown;
		awsSessionToken?: unknown;
	};
}

const isEnvVariablePayload = (val: unknown): val is IEnvVariablePayload => {
	if (typeof val !== "object" || val === null) {
		return false;
	}
	return "envVariables" in val;
};

const isInfraPayload = (val: unknown): val is IInfraPayload => {
	if (typeof val !== "object" || val === null) {
		return false;
	}
	return "infra" in val;
};

router.post("/env", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const auth0UserId = verification.auth0UserId;

	if (auth0UserId === "") {
		return c.json({ error: "User ID not found in token" }, 401);
	}

	const body = await c.req.json<IEnvVariablePayload>();

	if (!isEnvVariablePayload(body) || !Array.isArray(body.envVariables)) {
		return c.json(
			{
				error: "Invalid payload",
				message: "envVariables must be an array of { key, value } objects.",
			},
			400,
		);
	}

	const envRecord = body.envVariables.reduce<Record<string, string>>(
		(acc, item) => {
			if (
				typeof item.key === "string" &&
				item.key.trim() !== "" &&
				typeof item.value === "string"
			) {
				acc[item.key.trim()] = item.value;
			}
			return acc;
		},
		{},
	);

	try {
		const currentMetadata = await getUserMetadata(auth0UserId);

		const baseMetadata = currentMetadata ?? {};

		const updatedMetadata: Record<string, unknown> = {
			...baseMetadata,
			env: envRecord,
		};

		await updateUserMetadata(auth0UserId, updatedMetadata);

		return c.json(
			{
				success: true,
				env: envRecord,
			},
			200,
		);
	} catch (error: unknown) {
		if (error instanceof Auth0ManagementApiNotConfiguredError) {
			return c.json(
				{
					error: "Auth0 Management API not configured",
					message: error.message,
					code: "AUTH0_MANAGEMENT_API_NOT_CONFIGURED",
				},
				500,
			);
		}
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to update user metadata",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to update user metadata",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

router.post("/infra", async (c) => {
	const verification = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!verification.ok) {
		return c.json(verification.body, verification.status);
	}

	const auth0UserId = verification.auth0UserId;

	if (auth0UserId === "") {
		return c.json({ error: "User ID not found in token" }, 401);
	}

	const body = await c.req.json<IInfraPayload>();

	if (!isInfraPayload(body) || !isRecord(body.infra)) {
		return c.json(
			{
				error: "Invalid payload",
				message: "infra must be an object with credential values.",
			},
			400,
		);
	}

	const infraPayload = body.infra;
	const { sshPublicKey, awsAccessKeyId, awsSecretAccessKey, awsSessionToken } =
		infraPayload;

	if (
		typeof sshPublicKey !== "string" ||
		typeof awsAccessKeyId !== "string" ||
		typeof awsSecretAccessKey !== "string"
	) {
		return c.json(
			{
				error: "Invalid payload",
				message:
					"sshPublicKey, awsAccessKeyId, and awsSecretAccessKey are required.",
			},
			400,
		);
	}

	const infraRecord: Record<string, string> = {
		sshPublicKey,
		awsAccessKeyId,
		awsSecretAccessKey,
		awsSessionToken: typeof awsSessionToken === "string" ? awsSessionToken : "",
	};

	try {
		const currentMetadata = await getUserMetadata(auth0UserId);

		const baseMetadata = currentMetadata ?? {};

		const updatedMetadata: Record<string, unknown> = {
			...baseMetadata,
			infra: infraRecord,
		};

		await updateUserMetadata(auth0UserId, updatedMetadata);

		return c.json(
			{
				success: true,
				infra: infraRecord,
			},
			200,
		);
	} catch (error: unknown) {
		if (error instanceof Auth0ManagementApiNotConfiguredError) {
			return c.json(
				{
					error: "Auth0 Management API not configured",
					message: error.message,
					code: "AUTH0_MANAGEMENT_API_NOT_CONFIGURED",
				},
				500,
			);
		}
		if (error instanceof Error) {
			return c.json(
				{
					error: "Failed to update user metadata",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				error: "Failed to update user metadata",
				message: "An unexpected error occurred",
			},
			500,
		);
	}
});

export default router;
