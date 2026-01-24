interface ITerraformConfig {
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

const WORKSPACE_ID_CACHE: { value: string | null } = { value: null };

const getTerraformConfig = (): ITerraformConfig => {
	const token = process.env.TERRAFORM_CLOUD_TOKEN;
	const organization = process.env.TERRAFORM_CLOUD_ORG;
	const workspace = process.env.TERRAFORM_CLOUD_WORKSPACE;

	if (token === undefined || token === "") {
		throw new Error("TERRAFORM_CLOUD_TOKEN is not configured");
	}
	if (organization === undefined || organization === "") {
		throw new Error("TERRAFORM_CLOUD_ORG is not configured");
	}
	if (workspace === undefined || workspace === "") {
		throw new Error("TERRAFORM_CLOUD_WORKSPACE is not configured");
	}

	return {
		apiBaseUrl: "https://app.terraform.io/api/v2",
		token,
		organization,
		workspace,
	};
};

const terraformFetch = async (
	path: string,
	options?: RequestInit,
): Promise<Response> => {
	const config = getTerraformConfig();
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

export const getTerraformWorkspaceId = async (): Promise<string> => {
	if (WORKSPACE_ID_CACHE.value !== null) {
		return WORKSPACE_ID_CACHE.value;
	}

	const config = getTerraformConfig();
	const response = await terraformFetch(
		`/organizations/${config.organization}/workspaces/${config.workspace}`,
	);

	if (!response.ok) {
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
		WORKSPACE_ID_CACHE.value = data.data.id;
		return data.data.id;
	}

	throw new Error("Terraform workspace response missing ID");
};

export const getTerraformWorkspaceVariables = async (): Promise<
	ITerraformVariable[]
> => {
	const workspaceId = await getTerraformWorkspaceId();
	const response = await terraformFetch(`/workspaces/${workspaceId}/vars`);

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
	variables: ITerraformVariableInput[],
): Promise<void> => {
	const workspaceId = await getTerraformWorkspaceId();
	const existing = await getTerraformWorkspaceVariables();
	const existingMap = new Map<string, ITerraformVariable>();
	for (const item of existing) {
		existingMap.set(`${item.category}:${item.key}`, item);
	}

	for (const variable of variables) {
		const existingVar = existingMap.get(`${variable.category}:${variable.key}`);

		if (existingVar) {
			const response = await terraformFetch(`/vars/${existingVar.id}`, {
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
			const response = await terraformFetch(`/workspaces/${workspaceId}/vars`, {
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
			});

			if (!response.ok) {
				throw new Error(`Failed to create Terraform variable ${variable.key}`);
			}
		}
	}
};

export const createTerraformRun = async (
	message: string,
): Promise<ITerraformRunResult> => {
	const workspaceId = await getTerraformWorkspaceId();
	const response = await terraformFetch("/runs", {
		method: "POST",
		body: JSON.stringify({
			data: {
				type: "runs",
				attributes: {
					message,
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
	runId: string,
): Promise<ITerraformRunResult> => {
	const response = await terraformFetch(`/runs/${runId}`);
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

export const getTerraformOutputs = async (): Promise<
	Record<string, unknown>
> => {
	const workspaceId = await getTerraformWorkspaceId();
	const response = await terraformFetch(
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
