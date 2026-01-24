import { useState, useEffect, useRef, useCallback } from 'react';
import type { ClipboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { useUserStore } from '@/useUserStore.ts';
import { useUserProfileStore } from '@/useUserProfileStore.ts';
import { ContextMenu } from '@/components/UI/ContextMenu.tsx';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import tokenPermissionsImage from '@/assets/images/token-permissions.png';
import {
  encryptSecret,
  decryptSecret,
  isEncryptedValue,
  parseEncryptedValue,
  validatePassphraseStrength,
} from '@/utils/zeroKnowledgeEncryption.ts';
import {
  storePassphraseInSession,
  getPassphraseFromSession,
  clearPassphraseSession,
} from '@/utils/passphraseSession.ts';
import { isRecord } from '@/utils/typeGuards.ts';

const generateEntryId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

interface IEnvEntry {
  id: string;
  key: string;
  value: string;
  isSaved?: boolean;
}

const createEmptyEnvEntry = (): IEnvEntry => ({
  id: generateEntryId(),
  key: '',
  value: '',
  isSaved: false,
});

const extractEnvEntriesFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): IEnvEntry[] => {
  if (isRecord(metadata) && 'env' in metadata && isRecord(metadata.env)) {
    const envRecord = metadata.env;
    const entries = Object.entries(envRecord).map(([key, value]) => ({
      id: generateEntryId(),
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      isSaved: true,
    }));
    if (entries.length > 0) {
      return entries;
    }
  }
  return [createEmptyEnvEntry()];
};

const parseEnvInput = (
  rawInput: string,
): {
  key: string;
  value: string;
}[] => {
  if (typeof rawInput !== 'string' || rawInput.trim() === '') {
    return [];
  }
  return rawInput
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes('='))
    .map((line) => {
      const [rawKey, ...rawValueParts] = line.split('=');
      const key = rawKey.trim();
      const value = rawValueParts.join('=').trim();
      if (key === '') {
        return null;
      }
      return {
        key,
        value,
      };
    })
    .filter(
      (
        item,
      ): item is {
        key: string;
        value: string;
      } => item !== null,
    );
};

const normalizeEnvEntries = (
  entries: IEnvEntry[],
): { key: string; value: string }[] => {
  return entries
    .map((entry) => ({
      key: entry.key.trim(),
      value: entry.value,
    }))
    .filter((entry) => entry.key !== '')
    .sort((a, b) => a.key.localeCompare(b.key));
};

const areEnvEntriesEqual = (
  entries1: IEnvEntry[],
  entries2: IEnvEntry[],
): boolean => {
  const normalized1 = normalizeEnvEntries(entries1);
  const normalized2 = normalizeEnvEntries(entries2);
  if (normalized1.length !== normalized2.length) {
    return false;
  }
  return normalized1.every(
    (entry1, index) =>
      entry1.key === normalized2[index]?.key &&
      entry1.value === normalized2[index]?.value,
  );
};

interface IUserProfileProps {
  onTokenUpdate?: (token: string) => void;
}

export default function UserProfile({ onTokenUpdate }: IUserProfileProps) {
  const queryClient = useQueryClient();
  const {
    user,
    logout,
    githubToken,
    isLoading,
    accessToken,
    refreshGitHubToken,
    userMetadata,
    encryptionAvailable,
    isTokenEncrypted,
    serverConfigStatus,
  } = useUser();
  const { setGithubToken, setUserMetadata: setUserMetadataStore } =
    useUserStore();
  const {
    isOpen: storeIsOpen,
    activePanel: storeActivePanel,
    closeUserProfile,
    setActivePanel: setStoreActivePanel,
  } = useUserProfileStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    'home' | 'githubToken' | 'env'
  >('home');

  useEffect(() => {
    if (storeIsOpen) {
      setIsOpen(true);
      setActivePanel(storeActivePanel);
    }
  }, [storeIsOpen, storeActivePanel]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [envEntries, setEnvEntries] = useState<IEnvEntry[]>(() =>
    extractEnvEntriesFromMetadata(userMetadata),
  );
  const [originalEnvEntries, setOriginalEnvEntries] = useState<IEnvEntry[]>(
    () => extractEnvEntriesFromMetadata(userMetadata),
  );
  const [isEnvSaving, setIsEnvSaving] = useState<boolean>(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSuccessMessage, setEnvSuccessMessage] = useState<string | null>(
    null,
  );
  const [editingEntryIds, setEditingEntryIds] = useState<Set<string>>(
    new Set(),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entryId: string;
  } | null>(null);
  const [showPassphraseModal, setShowPassphraseModal] =
    useState<boolean>(false);
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [confirmPassphraseInput, setConfirmPassphraseInput] =
    useState<string>('');
  const [passphraseErrors, setPassphraseErrors] = useState<string[]>([]);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [hasEncryptedData, setHasEncryptedData] = useState<boolean>(false);
  const [passphraseUnlocked, setPassphraseUnlocked] = useState<boolean>(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] =
    useState<boolean>(false);

  useEffect(() => {
    if (githubToken !== null && githubToken !== '') {
      setInputValue(githubToken);
      if (onTokenUpdate) {
        onTokenUpdate(githubToken);
      }
    }
  }, [githubToken, onTokenUpdate]);

  const checkForEncryptedData = useCallback(
    (metadata: Record<string, unknown> | null | undefined): boolean => {
      if (isRecord(metadata) && 'env' in metadata && isRecord(metadata.env)) {
        const envRecord = metadata.env;
        return Object.values(envRecord).some((value) => {
          if (typeof value === 'string') {
            return isEncryptedValue(value);
          }
          return false;
        });
      }
      return false;
    },
    [],
  );

  const decryptEnvEntries = useCallback(
    async (
      metadata: Record<string, unknown> | null | undefined,
      userId: string,
      passphrase: string,
    ): Promise<IEnvEntry[]> => {
      if (
        !isRecord(metadata) ||
        !('env' in metadata) ||
        !isRecord(metadata.env)
      ) {
        return [createEmptyEnvEntry()];
      }

      const envRecord = metadata.env;
      const entries: IEnvEntry[] = [];

      for (const [key, value] of Object.entries(envRecord)) {
        if (typeof value !== 'string') {
          continue;
        }

        const encryptedData = parseEncryptedValue(value);
        if (encryptedData !== null) {
          const decrypted = await decryptSecret(
            encryptedData,
            userId,
            passphrase,
          );
          entries.push({
            id: generateEntryId(),
            key,
            value: decrypted,
            isSaved: true,
          });
        } else {
          entries.push({
            id: generateEntryId(),
            key,
            value,
            isSaved: true,
          });
        }
      }

      if (entries.length === 0) {
        return [createEmptyEnvEntry()];
      }

      return entries;
    },
    [],
  );

  useEffect(() => {
    const hasEncrypted = checkForEncryptedData(userMetadata);
    setHasEncryptedData(hasEncrypted);

    if (hasEncrypted) {
      if (user?.sub !== undefined && user.sub !== '') {
        const sessionPassphrase = getPassphraseFromSession(user.sub);
        if (sessionPassphrase !== null) {
          setPassphraseUnlocked(true);
          setIsDecrypting(true);
          decryptEnvEntries(userMetadata, user.sub, sessionPassphrase)
            .then((decrypted) => {
              const hasEmpty = decrypted.some(
                (entry) => entry.key.trim() === '' && entry.value.trim() === '',
              );
              const entriesWithEmpty = hasEmpty
                ? decrypted
                : [...decrypted, createEmptyEnvEntry()];
              setEnvEntries(entriesWithEmpty);
              setOriginalEnvEntries(entriesWithEmpty);
            })
            .catch(() => {
              if (user.sub !== undefined && user.sub !== '') {
                clearPassphraseSession(user.sub);
              }
              setPassphraseUnlocked(false);
              setEnvError(
                'Failed to decrypt. Please enter your passphrase again.',
              );
            })
            .finally(() => {
              setIsDecrypting(false);
            });
        } else {
          setPassphraseUnlocked(false);
          setEnvEntries([createEmptyEnvEntry()]);
          setOriginalEnvEntries([createEmptyEnvEntry()]);
        }
      }
    } else {
      setPassphraseUnlocked(true);
      const extracted = extractEnvEntriesFromMetadata(userMetadata);
      const hasEmpty = extracted.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      const entriesWithEmpty = hasEmpty
        ? extracted
        : [...extracted, createEmptyEnvEntry()];
      setEnvEntries(entriesWithEmpty);
      setOriginalEnvEntries(entriesWithEmpty);
    }
    setEnvError(null);
  }, [userMetadata, user?.sub, checkForEncryptedData, decryptEnvEntries]);

  const isEnvDirty = !areEnvEntriesEqual(envEntries, originalEnvEntries);

  const saveGitHubToken = async (token: string) => {
    if (user === null || accessToken === null || accessToken === '') {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getApiUrl()}/github-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save token';
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json') === true) {
          try {
            const errorData: unknown = await response.json();
            interface IErrorResponse {
              error?: string;
              message?: string;
            }
            const isErrorResponse = (val: unknown): val is IErrorResponse => {
              return typeof val === 'object' && val !== null && 'error' in val;
            };
            if (isErrorResponse(errorData)) {
              errorMessage =
                errorData.error ?? errorData.message ?? errorMessage;
            }
          } catch {
            errorMessage = `Server error: ${String(response.status)} ${response.statusText}`;
          }
        } else {
          errorMessage = `Server error: ${String(response.status)} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setGithubToken(token);
      setInputValue(token);
      setHasChanges(false);
      setSuccessMessage('Token saved successfully');
      setShowSavedIndicator(true);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      setTimeout(() => {
        setShowSavedIndicator(false);
      }, 5000);
      await refreshGitHubToken();
      await queryClient.invalidateQueries({ queryKey: ['githubToken'] });
      if (onTokenUpdate) {
        onTokenUpdate(token);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGitHubToken = async () => {
    if (user === null || accessToken === null || accessToken === '') {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getApiUrl()}/github-token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete token';
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json') === true) {
          try {
            const errorData: unknown = await response.json();
            interface IErrorResponse {
              error?: string;
              message?: string;
            }
            const isErrorResponse = (val: unknown): val is IErrorResponse => {
              return typeof val === 'object' && val !== null && 'error' in val;
            };
            if (isErrorResponse(errorData)) {
              errorMessage =
                errorData.error ?? errorData.message ?? errorMessage;
            }
          } catch {
            errorMessage = `Server error: ${String(response.status)} ${response.statusText}`;
          }
        } else {
          errorMessage = `Server error: ${String(response.status)} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json') === true) {
        await response.json();
      }

      setGithubToken(null);
      setInputValue('');
      setHasChanges(false);
      setSuccessMessage('Token deleted successfully');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      await refreshGitHubToken();
      if (onTokenUpdate) {
        onTokenUpdate('');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const resetTokenState = () => {
    setHasChanges(false);
    setInputValue(githubToken ?? '');
    setError(null);
    setShowDeleteConfirm(false);
    setShowSavedIndicator(false);
  };

  const resetEnvState = () => {
    const hasEncrypted = checkForEncryptedData(userMetadata);
    if (hasEncrypted) {
      if (user?.sub !== undefined && user.sub !== '') {
        const sessionPassphrase = getPassphraseFromSession(user.sub);
        if (sessionPassphrase !== null) {
          void decryptEnvEntries(userMetadata, user.sub, sessionPassphrase)
            .then((decrypted) => {
              const hasEmpty = decrypted.some(
                (entry) => entry.key.trim() === '' && entry.value.trim() === '',
              );
              const entriesWithEmpty = hasEmpty
                ? decrypted
                : [...decrypted, createEmptyEnvEntry()];
              setEnvEntries(entriesWithEmpty);
              setOriginalEnvEntries(entriesWithEmpty);
            })
            .catch(() => {
              setEnvEntries([createEmptyEnvEntry()]);
              setOriginalEnvEntries([createEmptyEnvEntry()]);
            });
        } else {
          setEnvEntries([createEmptyEnvEntry()]);
          setOriginalEnvEntries([createEmptyEnvEntry()]);
        }
      } else {
        setEnvEntries([createEmptyEnvEntry()]);
        setOriginalEnvEntries([createEmptyEnvEntry()]);
      }
    } else {
      const extracted = extractEnvEntriesFromMetadata(userMetadata);
      const hasEmpty = extracted.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      const entriesWithEmpty = hasEmpty
        ? extracted
        : [...extracted, createEmptyEnvEntry()];
      setEnvEntries(entriesWithEmpty);
      setOriginalEnvEntries(entriesWithEmpty);
    }
    setEnvError(null);
    setEnvSuccessMessage(null);
    setPassphraseInput('');
    setConfirmPassphraseInput('');
    setPassphraseErrors([]);
    setShowDeleteAllConfirm(false);
  };

  const handlePassphraseSubmit = async () => {
    if (user?.sub === undefined) {
      return;
    }

    if (isFirstTimeSetup) {
      const validation = validatePassphraseStrength(passphraseInput);
      if (!validation.isValid) {
        setPassphraseErrors(validation.errors);
        return;
      }

      if (passphraseInput !== confirmPassphraseInput) {
        setPassphraseErrors(['Passphrases do not match']);
        return;
      }

      storePassphraseInSession(passphraseInput, user.sub);
      setPassphraseUnlocked(true);
      setShowPassphraseModal(false);
      setPassphraseInput('');
      setConfirmPassphraseInput('');
      setPassphraseErrors([]);
      setHasEncryptedData(true);
      void saveEnvironmentVariables();
    } else {
      setIsDecrypting(true);
      try {
        const decrypted = await decryptEnvEntries(
          userMetadata,
          user.sub,
          passphraseInput,
        );
        storePassphraseInSession(passphraseInput, user.sub);
        setPassphraseUnlocked(true);
        const hasEmpty = decrypted.some(
          (entry) => entry.key.trim() === '' && entry.value.trim() === '',
        );
        const entriesWithEmpty = hasEmpty
          ? decrypted
          : [...decrypted, createEmptyEnvEntry()];
        setEnvEntries(entriesWithEmpty);
        setOriginalEnvEntries(entriesWithEmpty);
        setShowPassphraseModal(false);
        setPassphraseInput('');
        setPassphraseErrors([]);
        setEnvError(null);
      } catch {
        setPassphraseErrors(['Incorrect passphrase. Please try again.']);
      } finally {
        setIsDecrypting(false);
      }
    }
  };

  const handleDeleteAllSecrets = async () => {
    if (user?.sub === undefined || accessToken === null || accessToken === '') {
      return;
    }

    const userId = user.sub;
    setIsEnvSaving(true);
    setEnvError(null);

    try {
      const payload = {
        envVariables: [],
      };

      const response = await fetch(`${getApiUrl()}/user-metadata/env`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to delete environment variables');
      }

      const updatedMetadata = {
        ...userMetadata,
        env: {},
      };
      setUserMetadataStore(updatedMetadata);
      clearPassphraseSession(userId);
      void queryClient.invalidateQueries({
        queryKey: ['userMetadata', userId],
      });
      setHasEncryptedData(false);
      setPassphraseUnlocked(true);
      setEnvEntries([createEmptyEnvEntry()]);
      setOriginalEnvEntries([createEmptyEnvEntry()]);
      setShowDeleteAllConfirm(false);
      setShowPassphraseModal(false);
      setPassphraseInput('');
      setPassphraseErrors([]);
      setEnvSuccessMessage(
        'All environment variables deleted. You can now set a new passphrase.',
      );
    } catch (deleteError: unknown) {
      if (deleteError instanceof Error) {
        setEnvError(deleteError.message);
      } else {
        setEnvError('Failed to delete environment variables');
      }
    } finally {
      setIsEnvSaving(false);
    }
  };

  const addEnvEntry = (): string | null => {
    let newEntryId: string | null = null;
    setEnvEntries((prev) => {
      const hasEmpty = prev.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      if (!hasEmpty) {
        const newEntry = createEmptyEnvEntry();
        newEntryId = newEntry.id;
        return [...prev, newEntry];
      }
      return prev;
    });
    setEnvError(null);
    setEnvSuccessMessage(null);
    return newEntryId;
  };

  const updateEnvEntry = (
    id: string,
    field: 'key' | 'value',
    value: string,
  ) => {
    setEnvEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]: value,
            }
          : entry,
      ),
    );
    setEnvError(null);
    setEnvSuccessMessage(null);
  };

  const removeEnvEntry = (id: string) => {
    setEnvEntries((prev) => {
      const filtered = prev.filter((entry) => entry.id !== id);
      const hasEmpty = filtered.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      if (!hasEmpty) {
        return [...filtered, createEmptyEnvEntry()];
      }
      return filtered;
    });
    setEnvError(null);
    setEnvSuccessMessage(null);
  };

  const applyBulkEnvEntries = (
    entriesToApply: { key: string; value: string }[],
    entryId: string,
  ) => {
    if (entriesToApply.length === 0) {
      return;
    }
    setEnvEntries((prev) => {
      const next = [...prev];
      const targetIndex = next.findIndex((entry) => entry.id === entryId);
      const [first, ...rest] = entriesToApply;
      if (targetIndex !== -1) {
        next[targetIndex] = {
          ...next[targetIndex],
          key: first.key,
          value: first.value,
        };
      } else {
        next.push({
          id: generateEntryId(),
          key: first.key,
          value: first.value,
        });
      }
      if (rest.length > 0) {
        rest.forEach((item) => {
          next.push({
            id: generateEntryId(),
            key: item.key,
            value: item.value,
          });
        });
      }
      const hasEmpty = next.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      if (!hasEmpty) {
        next.push(createEmptyEnvEntry());
      }
      return next;
    });
    setEnvError(null);
    setEnvSuccessMessage(null);
  };

  const handleEnvKeyPaste = (
    event: ClipboardEvent<HTMLInputElement>,
    entryId: string,
  ) => {
    const pastedText = event.clipboardData.getData('text');
    const parsedEntries = parseEnvInput(pastedText);
    if (parsedEntries.length === 0) {
      return;
    }
    event.preventDefault();
    applyBulkEnvEntries(parsedEntries, entryId);
  };

  const saveEnvironmentVariables = async () => {
    if (user?.sub === undefined || accessToken === null || accessToken === '') {
      return;
    }

    const passphrase = getPassphraseFromSession(user.sub);
    if (passphrase === null) {
      setIsFirstTimeSetup(!hasEncryptedData);
      setShowPassphraseModal(true);
      return;
    }

    setIsEnvSaving(true);
    setEnvError(null);
    setEnvSuccessMessage(null);

    try {
      const sanitizedEntries = envEntries
        .map((entry) => ({
          key: entry.key.trim(),
          value: entry.value,
        }))
        .filter((entry) => !(entry.key === '' && entry.value.trim() === ''));

      const incompleteRows = sanitizedEntries.filter(
        (entry) => entry.key === '' && entry.value.trim() !== '',
      );
      if (incompleteRows.length > 0) {
        throw new Error('Environment variable names cannot be empty.');
      }

      const duplicateKeys = sanitizedEntries
        .map((entry) => entry.key)
        .filter((key) => key !== '');

      const duplicateSet = new Set<string>();
      for (const key of duplicateKeys) {
        if (duplicateSet.has(key)) {
          throw new Error(`Duplicate environment variable detected: ${key}`);
        }
        duplicateSet.add(key);
      }

      const encryptedEntries = await Promise.all(
        sanitizedEntries
          .filter((entry) => entry.key !== '')
          .map(async (entry) => {
            if (entry.value.trim() === '') {
              return {
                key: entry.key,
                value: '',
              };
            }
            if (user.sub === undefined) {
              throw new Error('User ID is required');
            }
            const encrypted = await encryptSecret(
              entry.value,
              user.sub,
              passphrase,
            );
            return {
              key: entry.key,
              value: JSON.stringify(encrypted),
            };
          }),
      );

      const payload = {
        envVariables: encryptedEntries,
      };

      const response = await fetch(`${getApiUrl()}/user-metadata/env`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save environment variables';
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json') === true) {
          try {
            const errorData: unknown = await response.json();
            interface IErrorResponse {
              error?: string;
              message?: string;
            }
            const isErrorResponse = (val: unknown): val is IErrorResponse => {
              return typeof val === 'object' && val !== null && 'error' in val;
            };
            if (isErrorResponse(errorData)) {
              errorMessage =
                errorData.error ?? errorData.message ?? errorMessage;
            }
          } catch {
            errorMessage = `Server error: ${String(response.status)} ${response.statusText}`;
          }
        } else {
          const errorText = await response.text();
          errorMessage =
            errorText.trim() !== ''
              ? `${errorMessage}: ${errorText}`
              : `Server error: ${String(response.status)} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result: unknown = await response.json();
      let envRecord: Record<string, unknown> | null = null;
      if (isRecord(result) && 'env' in result && isRecord(result.env)) {
        envRecord = result.env;
      }

      if (envRecord === null) {
        throw new Error('Invalid response format from server');
      }

      const updatedMetadata = {
        ...userMetadata,
        env: envRecord,
      };
      setUserMetadataStore(updatedMetadata);

      const decrypted = await decryptEnvEntries(
        updatedMetadata,
        user.sub,
        passphrase,
      );
      const hasEmpty = decrypted.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      const entriesWithEmpty = hasEmpty
        ? decrypted
        : [...decrypted, createEmptyEnvEntry()];
      setEnvEntries(entriesWithEmpty);
      setOriginalEnvEntries(entriesWithEmpty);
      setEditingEntryIds(new Set());

      void queryClient.invalidateQueries({
        queryKey: ['userMetadata', user.sub],
      });

      setEnvSuccessMessage('Environment variables saved successfully');
    } catch (envSaveError: unknown) {
      if (envSaveError instanceof Error) {
        setEnvError(envSaveError.message);
      } else {
        setEnvError(
          'An unexpected error occurred while saving environment variables.',
        );
      }
    } finally {
      setIsEnvSaving(false);
    }
  };

  const handleEnvCancel = () => {
    resetEnvState();
  };

  const closePanel = () => {
    setActivePanel('home');
    setStoreActivePanel('home');
    resetTokenState();
    resetEnvState();
    closeUserProfile();
  };

  const handleSetActivePanel = (panel: 'home' | 'githubToken' | 'env') => {
    setActivePanel(panel);
    setStoreActivePanel(panel);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHasChanges(value !== (githubToken ?? ''));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = () => {
    const tokenValue = inputValue.trim();
    if (tokenValue !== '' && tokenValue !== (githubToken ?? '')) {
      void saveGitHubToken(tokenValue);
    }
  };

  const handleCancel = () => {
    setInputValue(githubToken ?? '');
    setHasChanges(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleDelete = () => {
    void deleteGitHubToken();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {showPassphraseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-bg-muted border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">
              {isFirstTimeSetup
                ? 'Set Encryption Passphrase'
                : 'Enter Encryption Passphrase'}
            </h2>

            {isFirstTimeSetup && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-600/50 rounded-md">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-label="Warning icon"
                  >
                    <title>Warning icon</title>
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-2">
                      CRITICAL: You are responsible for this passphrase
                    </p>
                    <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
                      <li>We cannot recover your secrets if you forget it</li>
                      <li>We cannot reset your passphrase</li>
                      <li>Write it down in a secure password manager</li>
                      <li>Do not share it with anyone</li>
                      <li>
                        Losing it means losing access to all encrypted data
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="passphrase-input"
                  className="block text-sm font-medium text-fg-muted mb-2"
                >
                  {isFirstTimeSetup ? 'Create Passphrase' : 'Enter Passphrase'}
                </label>
                <input
                  id="passphrase-input"
                  type="password"
                  value={passphraseInput}
                  onChange={(e) => {
                    setPassphraseInput(e.target.value);
                    setPassphraseErrors([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isFirstTimeSetup) {
                      e.preventDefault();
                      void handlePassphraseSubmit();
                    }
                  }}
                  placeholder="Enter your encryption passphrase"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {isFirstTimeSetup && (
                <div>
                  <label
                    htmlFor="confirm-passphrase-input"
                    className="block text-sm font-medium text-fg-muted mb-2"
                  >
                    Confirm Passphrase
                  </label>
                  <input
                    id="confirm-passphrase-input"
                    type="password"
                    value={confirmPassphraseInput}
                    onChange={(e) => {
                      setConfirmPassphraseInput(e.target.value);
                      setPassphraseErrors([]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handlePassphraseSubmit();
                      }
                    }}
                    placeholder="Confirm your passphrase"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {passphraseErrors.length > 0 && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-md">
                  <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                    {passphraseErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isFirstTimeSetup && (
                <p className="text-xs text-fg-subtle">
                  Minimum 12 characters with uppercase, lowercase, numbers, and
                  special characters
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    void handlePassphraseSubmit();
                  }}
                  disabled={
                    isDecrypting ||
                    passphraseInput.length < (isFirstTimeSetup ? 12 : 1) ||
                    (isFirstTimeSetup &&
                      (confirmPassphraseInput.length < 12 ||
                        passphraseInput !== confirmPassphraseInput ||
                        !validatePassphraseStrength(passphraseInput).isValid))
                  }
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDecrypting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-fg"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-label="Loading spinner"
                      >
                        <title>Loading spinner</title>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Decrypting...
                    </>
                  ) : isFirstTimeSetup ? (
                    'Set Passphrase'
                  ) : (
                    'Unlock'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPassphraseModal(false);
                    setPassphraseInput('');
                    setConfirmPassphraseInput('');
                    setPassphraseErrors([]);
                  }}
                  disabled={isDecrypting}
                  className="px-4 py-2 bg-secondary-hover hover:bg-secondary-active text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {!isFirstTimeSetup && hasEncryptedData && (
                <div className="border-t border-border pt-4 mt-4">
                  {!showDeleteAllConfirm ? (
                    <button
                      onClick={() => {
                        setShowDeleteAllConfirm(true);
                      }}
                      className="w-full text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Forgot passphrase? Delete all secrets and start fresh
                    </button>
                  ) : (
                    <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-md">
                      <p className="text-sm text-red-300 mb-3">
                        This will permanently delete all your encrypted
                        environment variables. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            void handleDeleteAllSecrets();
                          }}
                          disabled={isEnvSaving}
                          className="flex-1 px-3 py-2 bg-secondary-hover hover:bg-secondary-hover text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center"
                        >
                          {isEnvSaving ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-label="Loading spinner"
                              >
                                <title>Loading spinner</title>
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            'Yes, Delete All'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteAllConfirm(false);
                          }}
                          disabled={isEnvSaving}
                          className="flex-1 px-3 py-2 bg-secondary-hover hover:bg-secondary-active text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
              closePanel();
            }
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() ??
              user?.email?.charAt(0).toUpperCase() ??
              'U'}
          </div>
          <span className="text-fg-muted text-sm">
            Hi,{' '}
            <span className="font-medium text-fg">
              {user?.name ?? user?.email ?? 'User'}
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-fg-subtle transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Dropdown arrow"
          >
            <title>Dropdown arrow</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                closePanel();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  closePanel();
                }
              }}
              role="button"
              tabIndex={-1}
            />
            <div className="fixed inset-x-0 bottom-0 w-full max-h-[80vh] overflow-y-auto rounded-t-lg md:absolute md:inset-auto md:right-0 md:top-12 md:w-auto md:min-w-[var(--dropdown-width-md)] md:max-w-2xl md:max-h-none md:overflow-visible md:rounded-lg bg-bg-muted border border-border shadow-xl z-50">
              {activePanel === 'home' ? (
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-fg">
                      {user?.name ?? user?.email ?? 'User'}
                    </p>
                    <p className="text-xs text-fg-subtle mt-1">
                      {user?.email ?? 'No email'}
                    </p>
                  </div>
                  {!isLoading &&
                    serverConfigStatus !== null &&
                    serverConfigStatus.auth0ManagementApiConfigured ===
                      true && (
                      <>
                        <button
                          onClick={() => {
                            resetTokenState();
                            handleSetActivePanel('githubToken');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-sm text-fg-muted hover:bg-secondary-hover rounded-md transition-colors text-left"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <title>Key icon</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          {githubToken !== null && githubToken !== ''
                            ? 'Manage GitHub Token'
                            : 'Add GitHub Token'}
                        </button>
                        <button
                          onClick={() => {
                            resetEnvState();
                            handleSetActivePanel('env');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-muted hover:bg-secondary-hover rounded-md transition-colors text-left"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <title>Plus icon</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Environment Variables
                        </button>
                      </>
                    )}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-muted hover:bg-secondary-hover rounded-md transition-colors text-left"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Logout icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              ) : activePanel === 'githubToken' &&
                !isLoading &&
                serverConfigStatus !== null &&
                serverConfigStatus.auth0ManagementApiConfigured === true ? (
                <>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <button
                      onClick={() => {
                        handleSetActivePanel('home');
                        resetTokenState();
                      }}
                      className="flex items-center gap-2 text-fg-subtle hover:text-fg transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <title>Back arrow</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back
                    </button>
                    <h2 className="text-lg font-semibold text-fg">
                      Manage GitHub Token
                    </h2>
                    <div className="w-16" />
                  </div>
                  {(!encryptionAvailable ||
                    (githubToken !== null &&
                      githubToken !== '' &&
                      isTokenEncrypted === false)) && (
                    <div className="mx-4 mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>Warning icon</title>
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-300">
                            Security Warning: Encryption Not Available
                          </p>
                          <p className="text-xs text-yellow-200/80 mt-1">
                            {!encryptionAvailable
                              ? 'ENCRYPTION_KEY is not set on the server. Your GitHub token will be stored as plain text. Set the ENCRYPTION_KEY environment variable to enable encryption.'
                              : 'Your GitHub token is currently stored as plain text. Re-save it to encrypt it with the server encryption key.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="github-token-input"
                          className="block text-sm font-medium text-fg-muted"
                        >
                          GitHub Personal Access Token
                        </label>
                        {showSavedIndicator && (
                          <span className="flex items-center text-xs text-green-400 animate-fade-out">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <title>Checkmark icon</title>
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Saved
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          id="github-token-input"
                          type={showToken ? 'text' : 'password'}
                          value={inputValue}
                          onChange={(e) => {
                            handleInputChange(e.target.value);
                          }}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          disabled={isSaving || isDeleting}
                          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowToken(!showToken);
                          }}
                          className="px-3 py-2 bg-secondary-hover hover:bg-secondary-active text-fg-muted rounded-md transition-colors text-sm"
                          disabled={githubToken === null || githubToken === ''}
                        >
                          {showToken ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-label="Hide token icon"
                            >
                              <title>Hide token</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-label="Show token icon"
                            >
                              <title>Show token</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {error !== null && error !== '' && (
                        <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded-md flex items-start">
                          <svg
                            className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <title>Error icon</title>
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-red-300">{error}</span>
                        </div>
                      )}
                      {successMessage !== null && successMessage !== '' && (
                        <div className="mt-2 p-2 bg-green-900/50 border border-green-700 rounded-md flex items-center">
                          <svg
                            className="w-5 h-5 text-green-400 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <title>Success icon</title>
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-green-300">
                            {successMessage}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-fg-subtle space-y-3">
                        <p>
                          <a
                            href="https://github.com/settings/personal-access-tokens/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 underline"
                          >
                            Create a fine-grained personal access token
                          </a>{' '}
                          with{' '}
                          <span className="text-fg-subtle">Read and Write</span>{' '}
                          permissions for{' '}
                          <span className="text-fg-subtle">Administration</span>{' '}
                          and <span className="text-fg-subtle">Contents</span>.
                        </p>
                        <div className="mt-3 p-3 bg-secondary/50 border border-border rounded-md">
                          <p className="text-xs text-fg-subtle mb-2">
                            Example token permissions:
                          </p>
                          <img
                            src={tokenPermissionsImage}
                            alt="GitHub token permissions example showing Administration, Contents, and Metadata sections"
                            className="w-full rounded border border-border"
                          />
                        </div>
                      </div>
                    </div>
                    {hasChanges && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving || inputValue.trim() === ''}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-fg"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <title>Loading spinner</title>
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving || isLoading}
                          className="px-4 py-2 bg-secondary-hover hover:bg-secondary-active text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {githubToken !== null &&
                      githubToken !== '' &&
                      !hasChanges &&
                      !showDeleteConfirm && (
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(true);
                          }}
                          disabled={isDeleting || isLoading}
                          className="w-full flex items-center justify-center px-4 py-2 bg-secondary-hover/10 hover:bg-secondary-hover/20 text-red-400 border border-red-600/50 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <title>Delete icon</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete Token
                        </button>
                      )}

                    {showDeleteConfirm && (
                      <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-md">
                        <p className="text-sm text-red-300 mb-3">
                          Are you sure you want to delete your GitHub token?
                          This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-secondary-hover hover:bg-secondary-hover text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  aria-label="Loading spinner"
                                >
                                  <title>Loading</title>
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                                Deleting...
                              </>
                            ) : (
                              'Yes, Delete'
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                            }}
                            disabled={isDeleting}
                            className="flex-1 px-3 py-2 bg-secondary-hover hover:bg-secondary-active text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : activePanel === 'env' &&
                !isLoading &&
                serverConfigStatus !== null &&
                serverConfigStatus.auth0ManagementApiConfigured === true ? (
                <>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <button
                      onClick={() => {
                        handleSetActivePanel('home');
                        handleEnvCancel();
                      }}
                      className="flex items-center gap-2 text-fg-subtle hover:text-fg transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <title>Back arrow</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back
                    </button>
                    <h2 className="text-lg font-semibold text-fg">
                      Environment Variables
                    </h2>
                    <div className="w-16" />
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm text-fg-subtle text-justify leading-relaxed">
                        These values are available via{' '}
                        <span className="text-primary-300 font-mono">
                          [[USE_USER_ENV(key)]]
                        </span>
                        . Paste one or more{' '}
                        <span className="font-mono">NAME=VALUE</span> entries to
                        auto-create rows.
                      </p>
                      <p className="text-xs text-amber-400 mt-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>Lock icon</title>
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Secrets are encrypted with your passphrase
                        (zero-knowledge)
                      </p>
                    </div>

                    {hasEncryptedData && !passphraseUnlocked && (
                      <div className="p-6 border border-border rounded-md text-center">
                        <svg
                          className="w-12 h-12 text-fg-subtle mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <title>Lock icon</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <h3 className="text-lg font-medium text-fg mb-2">
                          Secrets Locked
                        </h3>
                        <p className="text-sm text-fg-subtle mb-4">
                          Your environment variables are encrypted. Enter your
                          passphrase to view and edit them.
                        </p>
                        <button
                          onClick={() => {
                            setIsFirstTimeSetup(false);
                            setShowPassphraseModal(true);
                          }}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-fg rounded-md transition-colors text-sm font-medium"
                        >
                          Unlock Secrets
                        </button>
                      </div>
                    )}

                    {envError !== null && envError !== '' && (
                      <div className="p-2 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-300 flex items-start">
                        <svg
                          className="w-5 h-5 text-red-400 mr-2 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>Error icon</title>
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{envError}</span>
                      </div>
                    )}
                    {envSuccessMessage !== null && envSuccessMessage !== '' && (
                      <div className="p-2 bg-green-900/40 border border-green-600 rounded-md text-sm text-green-300 flex items-center">
                        <svg
                          className="w-5 h-5 text-green-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>Success icon</title>
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{envSuccessMessage}</span>
                      </div>
                    )}
                    {passphraseUnlocked && (
                      <>
                        <div className="space-y-4">
                          <div className="border border-border rounded-md p-4">
                            <div className="grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center pb-3 px-1 border-b border-border mb-3">
                              <label className="text-xs font-medium text-fg-subtle uppercase tracking-wide text-left">
                                Key
                              </label>
                              <label className="text-xs font-medium text-fg-subtle uppercase tracking-wide text-left">
                                Value
                              </label>
                              <div className="w-20" />
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto px-1">
                              {(() => {
                                const editableEntries = envEntries.filter(
                                  (entry) =>
                                    entry.isSaved !== true ||
                                    editingEntryIds.has(entry.id),
                                );

                                return (
                                  <>
                                    {editableEntries.map((entry) => {
                                      return (
                                        <div
                                          key={entry.id}
                                          className="env-row grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center"
                                        >
                                          <input
                                            value={entry.key}
                                            onChange={(e) => {
                                              updateEnvEntry(
                                                entry.id,
                                                'key',
                                                e.target.value,
                                              );
                                            }}
                                            onPaste={(event) => {
                                              handleEnvKeyPaste(
                                                event,
                                                entry.id,
                                              );
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                              } else if (
                                                e.key === 'Backspace' &&
                                                entry.key === '' &&
                                                entry.value === '' &&
                                                editableEntries.length > 1
                                              ) {
                                                e.preventDefault();
                                                const currentIndex =
                                                  editableEntries.findIndex(
                                                    (e) => e.id === entry.id,
                                                  );
                                                if (currentIndex > 0) {
                                                  const valueInputs =
                                                    document.querySelectorAll<HTMLInputElement>(
                                                      'input[name="apiValue"]',
                                                    );
                                                  if (
                                                    currentIndex - 1 <
                                                    valueInputs.length
                                                  ) {
                                                    const prevInput =
                                                      valueInputs[
                                                        currentIndex - 1
                                                      ];
                                                    prevInput.focus();
                                                  }
                                                  setTimeout(() => {
                                                    const envRows =
                                                      document.querySelectorAll<HTMLDivElement>(
                                                        '.env-row',
                                                      );
                                                    if (envRows.length > 0) {
                                                      const lastRow =
                                                        envRows[
                                                          envRows.length - 1
                                                        ];
                                                      lastRow.remove();
                                                    }
                                                  }, 0);
                                                }
                                                removeEnvEntry(entry.id);
                                              }
                                            }}
                                            name="apiKey"
                                            placeholder="API_KEY"
                                            className="px-3 py-2 bg-secondary border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-left"
                                            autoComplete="off"
                                          />
                                          <input
                                            value={entry.value}
                                            onChange={(e) => {
                                              updateEnvEntry(
                                                entry.id,
                                                'value',
                                                e.target.value,
                                              );
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const hasEmpty =
                                                  editableEntries.some(
                                                    (e) =>
                                                      e.key.trim() === '' &&
                                                      e.value.trim() === '',
                                                  );
                                                if (!hasEmpty) {
                                                  addEnvEntry();
                                                }
                                                setTimeout(() => {
                                                  {
                                                    const keyInputs =
                                                      document.querySelectorAll<HTMLInputElement>(
                                                        'input[name="apiKey"]',
                                                      );
                                                    if (keyInputs.length > 0) {
                                                      keyInputs[
                                                        keyInputs.length - 1
                                                      ].focus();
                                                    }
                                                  }
                                                }, 0);
                                              } else if (
                                                e.key === 'Backspace' &&
                                                entry.key === '' &&
                                                entry.value === '' &&
                                                editableEntries.length > 1
                                              ) {
                                                e.preventDefault();
                                                const currentIndex =
                                                  editableEntries.findIndex(
                                                    (e) => e.id === entry.id,
                                                  );
                                                removeEnvEntry(entry.id);
                                                if (currentIndex > 0) {
                                                  setTimeout(() => {
                                                    const valueInputs =
                                                      document.querySelectorAll<HTMLInputElement>(
                                                        'input[name="apiValue"]',
                                                      );
                                                    if (
                                                      currentIndex - 1 <
                                                      valueInputs.length
                                                    ) {
                                                      const prevInput =
                                                        valueInputs[
                                                          currentIndex - 1
                                                        ];
                                                      prevInput.focus();
                                                    }
                                                  }, 0);
                                                }
                                              }
                                            }}
                                            name="apiValue"
                                            placeholder="Value"
                                            className="px-3 py-2 bg-secondary border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-left"
                                          />
                                          <div className="w-5" />
                                        </div>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          {(() => {
                            const savedEntries = envEntries.filter(
                              (entry) =>
                                entry.isSaved === true &&
                                !editingEntryIds.has(entry.id),
                            );

                            if (savedEntries.length === 0) {
                              return null;
                            }

                            return (
                              <div className="border border-border rounded-md p-4">
                                <div className="grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center pb-3 px-1 border-b border-border mb-3">
                                  <label className="text-xs font-medium text-fg-subtle uppercase tracking-wide text-left">
                                    Key
                                  </label>
                                  <label className="text-xs font-medium text-fg-subtle uppercase tracking-wide text-left">
                                    Value
                                  </label>
                                  <div className="w-20" />
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto px-1">
                                  {savedEntries.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center"
                                    >
                                      <div className="px-3 py-2 text-fg-muted text-sm min-h-[2.5rem] flex items-center text-left">
                                        {entry.key}
                                      </div>
                                      <div className="px-3 py-2 text-fg-muted text-sm min-h-[2.5rem] flex items-center text-left">
                                        {entry.value}
                                      </div>
                                      <div className="flex gap-1 items-center h-[2.5rem]">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const rect =
                                              e.currentTarget.getBoundingClientRect();
                                            setContextMenu({
                                              x: rect.right - 120,
                                              y: rect.bottom + 4,
                                              entryId: entry.id,
                                            });
                                          }}
                                          className="p-2 text-fg-subtle hover:text-fg-muted hover:bg-secondary-hover rounded-md transition-colors"
                                          title="More options"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <title>More options</title>
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        {contextMenu !== null && (
                          <ContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            menuItems={[
                              {
                                id: 'edit',
                                label: 'Edit',
                                onClick: () => {
                                  setEditingEntryIds((prev) => {
                                    const next = new Set(prev);
                                    next.add(contextMenu.entryId);
                                    return next;
                                  });
                                  setEnvEntries((prev) =>
                                    prev.map((entry) =>
                                      entry.id === contextMenu.entryId
                                        ? { ...entry, isSaved: false }
                                        : entry,
                                    ),
                                  );
                                  setContextMenu(null);
                                },
                              },
                              {
                                id: 'remove',
                                label: 'Remove',
                                onClick: () => {
                                  removeEnvEntry(contextMenu.entryId);
                                  setContextMenu(null);
                                },
                                className:
                                  'text-red-400 hover:bg-red-900/20 hover:text-red-300',
                              },
                            ]}
                            onClose={() => {
                              setContextMenu(null);
                            }}
                            appendToBody={true}
                          />
                        )}
                        <button
                          onClick={() => {
                            void saveEnvironmentVariables();
                          }}
                          disabled={isEnvSaving || !isEnvDirty}
                          className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-fg rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEnvSaving ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-fg"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <title>Loading spinner</title>
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Saving...
                            </>
                          ) : (
                            'Save Environment Variables'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-fg">
                      {user?.name ?? user?.email ?? 'User'}
                    </p>
                    <p className="text-xs text-fg-subtle mt-1">
                      {user?.email ?? 'No email'}
                    </p>
                  </div>
                  <p className="p-4 text-sm text-fg-subtle text-center">
                    These features require Auth0 Management API configuration.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
