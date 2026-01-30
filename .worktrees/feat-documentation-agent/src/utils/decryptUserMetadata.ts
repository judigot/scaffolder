import { isRecord } from "@/utils/typeGuards.ts";
import {
	decryptSecret,
	parseEncryptedValue,
} from "@/utils/zeroKnowledgeEncryption.ts";

export async function decryptUserMetadataEnv(
	userMetadata: Record<string, unknown> | null | undefined,
	userId: string,
	passphrase: string,
): Promise<Record<string, unknown> | null> {
	if (!userMetadata) {
		return null;
	}

	if (!isRecord(userMetadata.env)) {
		return userMetadata;
	}

	const envRecord = userMetadata.env;
	const decryptedEnv: Record<string, string> = {};

	for (const [key, value] of Object.entries(envRecord)) {
		if (typeof value !== "string") {
			continue;
		}

		const encryptedData = parseEncryptedValue(value);
		if (encryptedData !== null) {
			try {
				const decrypted = await decryptSecret(
					encryptedData,
					userId,
					passphrase,
				);
				decryptedEnv[key] = decrypted;
			} catch {
				decryptedEnv[key] = "";
			}
		} else {
			decryptedEnv[key] = value;
		}
	}

	return {
		...userMetadata,
		env: decryptedEnv,
	};
}

export async function decryptUserMetadataInfra(
	userMetadata: Record<string, unknown> | null | undefined,
	userId: string,
	passphrase: string,
): Promise<Record<string, unknown> | null> {
	if (!userMetadata) {
		return null;
	}

	if (!isRecord(userMetadata.infra)) {
		return userMetadata;
	}

	const infraRecord = userMetadata.infra;
	const decryptedInfra: Record<string, string> = {};

	for (const [key, value] of Object.entries(infraRecord)) {
		if (typeof value !== "string") {
			continue;
		}

		const encryptedData = parseEncryptedValue(value);
		if (encryptedData !== null) {
			try {
				const decrypted = await decryptSecret(
					encryptedData,
					userId,
					passphrase,
				);
				decryptedInfra[key] = decrypted;
			} catch {
				decryptedInfra[key] = "";
			}
		} else {
			decryptedInfra[key] = value;
		}
	}

	return {
		...userMetadata,
		infra: decryptedInfra,
	};
}

export function hasEncryptedEnvValues(
	userMetadata: Record<string, unknown> | null | undefined,
): boolean {
	if (!userMetadata) {
		return false;
	}

	if (!isRecord(userMetadata.env)) {
		return false;
	}

	const envRecord = userMetadata.env;
	return Object.values(envRecord).some((value) => {
		if (typeof value !== "string") {
			return false;
		}
		return parseEncryptedValue(value) !== null;
	});
}

export function hasEncryptedInfraValues(
	userMetadata: Record<string, unknown> | null | undefined,
): boolean {
	if (!userMetadata) {
		return false;
	}

	if (!isRecord(userMetadata.infra)) {
		return false;
	}

	const infraRecord = userMetadata.infra;
	return Object.values(infraRecord).some((value) => {
		if (typeof value !== "string") {
			return false;
		}
		return parseEncryptedValue(value) !== null;
	});
}
