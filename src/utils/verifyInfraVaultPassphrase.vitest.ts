// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { encryptSecret } from '@/utils/zeroKnowledgeEncryption.ts';
import { verifyInfraVaultPassphrase } from '@/utils/verifyInfraVaultPassphrase.ts';

describe('verifyInfraVaultPassphrase', () => {
  const userId = 'auth0|vault-test-user';
  const passphrase = 'ValidVaultPassphrase123!';
  let userMetadata: Record<string, unknown>;

  beforeAll(async () => {
    const encrypted = await encryptSecret('test-token', userId, passphrase);
    userMetadata = { infra: { tfcToken: JSON.stringify(encrypted) } };
  });

  it('allows the matching passphrase', async () => {
    await expect(verifyInfraVaultPassphrase(userMetadata, userId, passphrase)).resolves.toBeUndefined();
  });

  it('rejects an incorrect passphrase', async () => {
    await expect(verifyInfraVaultPassphrase(userMetadata, userId, 'wrong-passphrase')).rejects.toThrow('Incorrect vault passphrase');
  });

  it('fails closed without an encrypted vault credential', async () => {
    await expect(verifyInfraVaultPassphrase({ infra: { tfcToken: 'plaintext' } }, userId, passphrase)).rejects.toThrow('Vault verification is unavailable');
  });

  it('fails closed without an authenticated user or a typed passphrase', async () => {
    await expect(verifyInfraVaultPassphrase(userMetadata, null, passphrase)).rejects.toThrow('Enter your vault passphrase');
    await expect(verifyInfraVaultPassphrase(userMetadata, userId, '')).rejects.toThrow('Enter your vault passphrase');
  });
});
