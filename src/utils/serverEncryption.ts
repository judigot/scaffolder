import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey === undefined || encryptionKey === '') {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encryption',
    );
  }

  if (encryptionKey.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }

  return Buffer.from(encryptionKey, 'hex');
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const derivedKey = crypto.pbkdf2Sync(
    key,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256',
  );

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString('base64');
}

export function decryptValue(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const derivedKey = crypto.pbkdf2Sync(
    key,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256',
  );

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

export function isEncryptedValue(value: string): boolean {
  try {
    const combined = Buffer.from(value, 'base64');
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
    return combined.length >= minLength;
  } catch {
    return false;
  }
}

export function isEncryptionAvailable(): boolean {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey === undefined || encryptionKey === '') {
    return false;
  }
  const trimmedKey = encryptionKey.trim();
  if (trimmedKey.length !== 64) {
    return false;
  }
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(trimmedKey)) {
    return false;
  }
  return true;
}
