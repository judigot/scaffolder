interface IEncryptionResult {
  encrypted: string;
  salt: string;
  iv: string;
}

const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const ALGORITHM = 'AES-GCM';

async function deriveEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  userId: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = `${userId}:${passphrase}`;
  const keyMaterialBuffer = encoder.encode(keyMaterial);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterialBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const keyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    KEY_LENGTH,
  );

  return crypto.subtle.importKey('raw', keyBits, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  let index = 0;
  for (const char of binary) {
    bytes[index] = char.charCodeAt(0);
    index += 1;
  }
  return bytes.buffer;
}

export async function encryptSecret(
  plaintext: string,
  userId: string,
  passphrase: string,
): Promise<IEncryptionResult> {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('Plaintext cannot be empty');
  }

  if (!passphrase || passphrase.length < 12) {
    throw new Error('Passphrase must be at least 12 characters');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveEncryptionKey(passphrase, salt, userId);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encoder.encode(plaintext),
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptSecret(
  encryptedData: IEncryptionResult,
  userId: string,
  passphrase: string,
): Promise<string> {
  try {
    const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
    const encrypted = base64ToArrayBuffer(encryptedData.encrypted);

    const key = await deriveEncryptionKey(passphrase, salt, userId);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new Error(
      'Decryption failed. This usually means the passphrase is incorrect.',
    );
  }
}

export function isEncryptedValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'encrypted' in parsed &&
      'salt' in parsed &&
      'iv' in parsed
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function parseEncryptedValue(value: string): IEncryptionResult | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'encrypted' in parsed &&
      'salt' in parsed &&
      'iv' in parsed
    ) {
      const result = parsed;
      if (
        typeof result.encrypted === 'string' &&
        typeof result.salt === 'string' &&
        typeof result.iv === 'string'
      ) {
        return {
          encrypted: result.encrypted,
          salt: result.salt,
          iv: result.iv,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function validatePassphraseStrength(passphrase: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
} {
  const errors: string[] = [];

  if (passphrase.length < 12) {
    errors.push('Passphrase must be at least 12 characters long');
  }

  if (passphrase.length > 128) {
    errors.push('Passphrase must be less than 128 characters');
  }

  const hasLowercase = /[a-z]/.test(passphrase);
  const hasUppercase = /[A-Z]/.test(passphrase);
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);

  if (!hasLowercase) {
    errors.push('Passphrase must contain at least one lowercase letter');
  }

  if (!hasUppercase) {
    errors.push('Passphrase must contain at least one uppercase letter');
  }

  if (!hasNumber) {
    errors.push('Passphrase must contain at least one number');
  }

  if (!hasSpecial) {
    errors.push('Passphrase must contain at least one special character');
  }

  const commonPasswords = [
    'password',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'letmein',
    'welcome',
    'admin',
  ];
  const lowerPassphrase = passphrase.toLowerCase();
  if (commonPasswords.some((common) => lowerPassphrase.includes(common))) {
    errors.push('Passphrase contains common words and is too weak');
  }

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  const criteriaCount = [
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  if (passphrase.length >= 12 && criteriaCount >= 2) {
    strength = 'fair';
  }
  if (passphrase.length >= 14 && criteriaCount >= 3) {
    strength = 'good';
  }
  if (passphrase.length >= 16 && criteriaCount === 4) {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}
