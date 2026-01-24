export interface ITerraformConfig {
	apiBaseUrl: string;
	token: string;
	organization: string;
	workspace: string;
}

interface ITerraformVariableInput {
	key: string;
	value: string;
	category: "env" | "terraform";
	sensitive: boolean;
}

interface ITerraformVariable {
	id: string;
	key: string;
	category: "env" | "terraform";
	value?: string | null;
	sensitive: boolean;
}

interface ITerraformRunResult {
	id: string;
	status: string;
}

const TFC_API_BASE_URL = "https://app.terraform.io/api/v2";

const terraformFetch = async (
	config: ITerraformConfig,
	path: string,
	options?: RequestInit,
): Promise<Response> => {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${config.token}`,
		"Content-Type": "application/vnd.api+json",
	};
	if (options?.headers) {
		Object.assign(headers, options.headers);
	}
	return fetch(`${config.apiBaseUrl}${path}`, {
		...options,
		headers,
	});
};

export const validateTerraformConfig = (config: ITerraformConfig): void => {
	if (!config.token || config.token.trim() === "") {
		throw new Error("Terraform Cloud token is missing");
	}
	if (!config.organization || config.organization.trim() === "") {
		throw new Error("Terraform Cloud organization is missing");
	}
	if (!config.workspace || config.workspace.trim() === "") {
		throw new Error("Terraform Cloud workspace is missing");
	}
};

export const createTerraformConfigFromCredentials = (creds: {
	tfcToken: string;
	tfcOrg: string;
	tfcWorkspace: string;
}): ITerraformConfig => {
	return {
		apiBaseUrl: TFC_API_BASE_URL,
		token: creds.tfcToken,
		organization: creds.tfcOrg,
		workspace: creds.tfcWorkspace,
	};
};

export const getTerraformWorkspaceId = async (
	config: ITerraformConfig,
): Promise<string> => {
	const response = await terraformFetch(
		config,
		`/organizations/${config.organization}/workspaces/${config.workspace}`,
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(
				`Workspace "${config.workspace}" not found in organization "${config.organization}"`,
			);
		}
		if (response.status === 401) {
			throw new Error(
				"Terraform Cloud token is invalid or expired",
			);
		}
		throw new Error("Failed to fetch Terraform workspace");
	}

	const data: unknown = await response.json();
	if (
		typeof data === "object" &&
		data !== null &&
		"data" in data &&
		typeof data.data === "object" &&
		data.data !== null &&
		"id" in data.data &&
		typeof data.data.id === "string"
	) {
		return data.data.id;
	}

	throw new Error("Terraform workspace response missing ID");
};

export const getTerraformWorkspaceVariables = async (
	config: ITerraformConfig,
): Promise<ITerraformVariable[]> => {
	const workspaceId = await getTerraformWorkspaceId(config);
	const response = await terraformFetch(
		config,
		`/workspaces/${workspaceId}/vars`,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch Terraform workspace variables");
	}

	const payload: unknown = await response.json();
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("data" in payload) ||
		!Array.isArray(payload.data)
	) {
		return [];
	}

	const variables: ITerraformVariable[] = [];
	for (const item of payload.data) {
		if (
			typeof item !== "object" ||
			item === null ||
			!("id" in item) ||
			!("attributes" in item)
		) {
			continue;
		}
		const attributes = item.attributes;
		if (typeof attributes !== "object" || attributes === null) {
			continue;
		}

		const key =
			"key" in attributes && typeof attributes.key === "string"
				? attributes.key
				: null;
		const category =
			"category" in attributes &&
			(attributes.category === "env" || attributes.category === "terraform")
				? attributes.category
				: null;
		const sensitive =
			"sensitive" in attributes && typeof attributes.sensitive === "boolean"
				? attributes.sensitive
				: false;
		const value =
			"value" in attributes && typeof attributes.value === "string"
				? attributes.value
				: null;
		if (key === null || category === null) {
			continue;
		}
		variables.push({
			id: typeof item.id === "string" ? item.id : "",
			key,
			category,
			sensitive,
			value,
		});
	}

	return variables;
};

export const upsertTerraformVariables = async (
	config: ITerraformConfig,
	variables: ITerraformVariableInput[],
): Promise<void> => {
	const workspaceId = await getTerraformWorkspaceId(config);
	const existing = await getTerraformWorkspaceVariables(config);
	const existingMap = new Map<string, ITerraformVariable>();
	for (const item of existing) {
		existingMap.set(`${item.category}:${item.key}`, item);
	}

	for (const variable of variables) {
		const existingVar = existingMap.get(`${variable.category}:${variable.key}`);

		if (existingVar) {
			const response = await terraformFetch(config, `/vars/${existingVar.id}`, {
				method: "PATCH",
				body: JSON.stringify({
					data: {
						id: existingVar.id,
						type: "vars",
						attributes: {
							value: variable.value,
							sensitive: variable.sensitive,
						},
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to update Terraform variable ${variable.key}`);
			}
		} else {
			const response = await terraformFetch(
				config,
				`/workspaces/${workspaceId}/vars`,
				{
					method: "POST",
					body: JSON.stringify({
						data: {
							type: "vars",
							attributes: {
								key: variable.key,
								value: variable.value,
								category: variable.category,
								sensitive: variable.sensitive,
								hcl: false,
							},
							relationships: {
								workspace: {
									data: {
										id: workspaceId,
										type: "workspaces",
									},
								},
							},
						},
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to create Terraform variable ${variable.key}`);
			}
		}
	}
};

export const createTerraformRun = async (
	config: ITerraformConfig,
	message: string,
): Promise<ITerraformRunResult> => {
	const workspaceId = await getTerraformWorkspaceId(config);
	const response = await terraformFetch(config, "/runs", {
		method: "POST",
		body: JSON.stringify({
			data: {
				type: "runs",
				attributes: {
					message,
					"auto-apply": true,
				},
				relationships: {
					workspace: {
						data: {
							id: workspaceId,
							type: "workspaces",
						},
					},
				},
			},
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to create Terraform run");
	}

	const payload: unknown = await response.json();
	if (
		typeof payload === "object" &&
		payload !== null &&
		"data" in payload &&
		typeof payload.data === "object" &&
		payload.data !== null &&
		"id" in payload.data &&
		typeof payload.data.id === "string"
	) {
		const status =
			"attributes" in payload.data &&
			typeof payload.data.attributes === "object" &&
			payload.data.attributes !== null &&
			"status" in payload.data.attributes &&
			typeof payload.data.attributes.status === "string"
				? payload.data.attributes.status
				: "queued";
		return {
			id: payload.data.id,
			status,
		};
	}

	throw new Error("Terraform run response missing ID");
};

export const getTerraformRun = async (
	config: ITerraformConfig,
	runId: string,
): Promise<ITerraformRunResult> => {
	const response = await terraformFetch(config, `/runs/${runId}`);
	if (!response.ok) {
		throw new Error("Failed to fetch Terraform run status");
	}

	const payload: unknown = await response.json();
	if (
		typeof payload === "object" &&
		payload !== null &&
		"data" in payload &&
		typeof payload.data === "object" &&
		payload.data !== null &&
		"id" in payload.data &&
		typeof payload.data.id === "string"
	) {
		const status =
			"attributes" in payload.data &&
			typeof payload.data.attributes === "object" &&
			payload.data.attributes !== null &&
			"status" in payload.data.attributes &&
			typeof payload.data.attributes.status === "string"
				? payload.data.attributes.status
				: "unknown";
		return {
			id: payload.data.id,
			status,
		};
	}

	throw new Error("Terraform run response missing ID");
};

export const getTerraformOutputs = async (
	config: ITerraformConfig,
): Promise<Record<string, unknown>> => {
	const workspaceId = await getTerraformWorkspaceId(config);
	const response = await terraformFetch(
		config,
		`/workspaces/${workspaceId}/current-state-version`,
	);

	if (!response.ok) {
		return {};
	}

	const payload: unknown = await response.json();
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("data" in payload) ||
		typeof payload.data !== "object" ||
		payload.data === null ||
		!("id" in payload.data) ||
		typeof payload.data.id !== "string"
	) {
		return {};
	}

	const stateVersionId = payload.data.id;
	const outputsResponse = await terraformFetch(
		config,
		`/state-versions/${stateVersionId}/outputs`,
	);
	if (!outputsResponse.ok) {
		return {};
	}

	const outputsPayload: unknown = await outputsResponse.json();
	if (
		typeof outputsPayload !== "object" ||
		outputsPayload === null ||
		!("data" in outputsPayload) ||
		!Array.isArray(outputsPayload.data)
	) {
		return {};
	}

	const outputs: Record<string, unknown> = {};
	for (const item of outputsPayload.data) {
		if (
			typeof item !== "object" ||
			item === null ||
			!("attributes" in item) ||
			typeof item.attributes !== "object" ||
			item.attributes === null
		) {
			continue;
		}

		const name =
			"name" in item.attributes && typeof item.attributes.name === "string"
				? item.attributes.name
				: null;
		const value = "value" in item.attributes ? item.attributes.value : null;
		if (name !== null) {
			outputs[name] = value;
		}
	}

	return outputs;
};
