const PASSPHRASE_SESSION_KEY = 'scaffolder_encryption_passphrase';
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

interface IPassphraseSession {
  encodedPassphrase: string;
  expiresAt: number;
}

const isPassphraseSession = (val: unknown): val is IPassphraseSession => {
  if (val === null || typeof val !== 'object') {
    return false;
  }
  if (!('encodedPassphrase' in val) || !('expiresAt' in val)) {
    return false;
  }
  const record: Record<string, unknown> = val;
  return (
    typeof record.encodedPassphrase === 'string' &&
    typeof record.expiresAt === 'number'
  );
};

export function storePassphraseInSession(
  passphrase: string,
  userId: string,
): void {
  const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
  const sessionData: IPassphraseSession = {
    encodedPassphrase: btoa(encodeURIComponent(passphrase)),
    expiresAt,
  };
  localStorage.setItem(
    `${PASSPHRASE_SESSION_KEY}_${userId}`,
    JSON.stringify(sessionData),
  );
}

export function getPassphraseFromSession(userId: string): string | null {
  const key = `${PASSPHRASE_SESSION_KEY}_${userId}`;
  const stored = localStorage.getItem(key);

  if (stored === null || stored === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!isPassphraseSession(parsed)) {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return decodeURIComponent(atob(parsed.encodedPassphrase));
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearPassphraseSession(userId: string): void {
  const key = `${PASSPHRASE_SESSION_KEY}_${userId}`;
  localStorage.removeItem(key);
}

export function extendPassphraseSession(userId: string): void {
  const passphrase = getPassphraseFromSession(userId);
  if (passphrase !== null) {
    storePassphraseInSession(passphrase, userId);
  }
}

export function hasPassphraseInSession(userId: string): boolean {
  return getPassphraseFromSession(userId) !== null;
}
