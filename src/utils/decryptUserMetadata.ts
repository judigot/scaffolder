import {
  decryptSecret,
  parseEncryptedValue,
} from '@/utils/zeroKnowledgeEncryption.ts';

const isRecord = (val: unknown): val is Record<string, unknown> => {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
};

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
    if (typeof value !== 'string') {
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
        decryptedEnv[key] = '';
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
    if (typeof value !== 'string') {
      return false;
    }
    return parseEncryptedValue(value) !== null;
  });
}
