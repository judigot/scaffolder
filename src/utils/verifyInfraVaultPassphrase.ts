import { isRecord } from '@/utils/typeGuards.ts';
import { decryptSecret, parseEncryptedValue } from '@/utils/zeroKnowledgeEncryption.ts';

/**
 * Verifies a fresh passphrase against an encrypted credential saved in the vault.
 * Never accepts the cached session passphrase as proof of confirmation.
 */
export async function verifyInfraVaultPassphrase(
  userMetadata: Record<string, unknown> | null,
  userId: string | null,
  passphrase: string,
): Promise<void> {
  if (userId === null || userId === '' || passphrase === '') {
    throw new Error('Enter your vault passphrase to continue.');
  }

  const infra = userMetadata?.infra;
  if (!isRecord(infra)) {
    throw new Error('Vault verification is unavailable. Save encrypted infrastructure credentials in your profile first.');
  }

  const encryptedCredential = Object.values(infra)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => parseEncryptedValue(value))
    .find((value) => value !== null);

  if (encryptedCredential === undefined) {
    throw new Error('Vault verification is unavailable. Save encrypted infrastructure credentials in your profile first.');
  }

  try {
    await decryptSecret(encryptedCredential, userId, passphrase);
  } catch {
    throw new Error('Incorrect vault passphrase. No changes were made.');
  }
}
