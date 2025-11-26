import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../hooks/useUser';
import { useUserStore } from '../useUserStore';
import { ContextMenu } from '../components/UI/ContextMenu';
import { getApiUrl } from '../utils/getApiUrl';
const generateEntryId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};
const createEmptyEnvEntry = () => ({
  id: generateEntryId(),
  key: '',
  value: '',
  isSaved: false,
});
const isRecord = (value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const extractEnvEntriesFromMetadata = (metadata) => {
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
const parseEnvInput = (rawInput) => {
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
    .filter((item) => item !== null);
};
const normalizeEnvEntries = (entries) => {
  return entries
    .map((entry) => ({
      key: entry.key.trim(),
      value: entry.value,
    }))
    .filter((entry) => entry.key !== '')
    .sort((a, b) => a.key.localeCompare(b.key));
};
const areEnvEntriesEqual = (entries1, entries2) => {
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
export default function UserProfile({ onTokenUpdate }) {
  const {
    user,
    logout,
    githubToken,
    isLoading,
    accessToken,
    refreshGitHubToken,
    userMetadata,
  } = useUser();
  const { setGithubToken, setUserMetadata: setUserMetadataStore } =
    useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('home');
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const inputRef = useRef(null);
  const [envEntries, setEnvEntries] = useState(() =>
    extractEnvEntriesFromMetadata(userMetadata),
  );
  const [originalEnvEntries, setOriginalEnvEntries] = useState(() =>
    extractEnvEntriesFromMetadata(userMetadata),
  );
  const [isEnvSaving, setIsEnvSaving] = useState(false);
  const [envError, setEnvError] = useState(null);
  const [envSuccessMessage, setEnvSuccessMessage] = useState(null);
  const [editingEntryIds, setEditingEntryIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  useEffect(() => {
    if (githubToken !== null && githubToken !== '') {
      setInputValue(githubToken);
      if (onTokenUpdate) {
        onTokenUpdate(githubToken);
      }
    }
  }, [githubToken, onTokenUpdate]);
  useEffect(() => {
    const extracted = extractEnvEntriesFromMetadata(userMetadata);
    const hasEmpty = extracted.some(
      (entry) => entry.key.trim() === '' && entry.value.trim() === '',
    );
    const entriesWithEmpty = hasEmpty
      ? extracted
      : [...extracted, createEmptyEnvEntry()];
    setEnvEntries(entriesWithEmpty);
    setOriginalEnvEntries(entriesWithEmpty);
    setEnvError(null);
    setEnvSuccessMessage(null);
  }, [userMetadata]);
  const isEnvDirty = !areEnvEntriesEqual(envEntries, originalEnvEntries);
  const saveGitHubToken = async (token) => {
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
            const errorData = await response.json();
            const isErrorResponse = (val) => {
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
      if (onTokenUpdate) {
        onTokenUpdate(token);
      }
    } catch (error) {
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
            const errorData = await response.json();
            const isErrorResponse = (val) => {
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
    } catch (error) {
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
    const extracted = extractEnvEntriesFromMetadata(userMetadata);
    const hasEmpty = extracted.some(
      (entry) => entry.key.trim() === '' && entry.value.trim() === '',
    );
    const entriesWithEmpty = hasEmpty
      ? extracted
      : [...extracted, createEmptyEnvEntry()];
    setEnvEntries(entriesWithEmpty);
    setOriginalEnvEntries(entriesWithEmpty);
    setEnvError(null);
    setEnvSuccessMessage(null);
  };
  const addEnvEntry = () => {
    let newEntryId = null;
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
  const updateEnvEntry = (id, field, value) => {
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
  const removeEnvEntry = (id) => {
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
  const applyBulkEnvEntries = (entriesToApply, entryId) => {
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
  const handleEnvKeyPaste = (event, entryId) => {
    const pastedText = event.clipboardData.getData('text');
    const parsedEntries = parseEnvInput(pastedText);
    if (parsedEntries.length === 0) {
      return;
    }
    event.preventDefault();
    applyBulkEnvEntries(parsedEntries, entryId);
  };
  const saveEnvironmentVariables = async () => {
    if (user === null || accessToken === null || accessToken === '') {
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
      const duplicateSet = new Set();
      for (const key of duplicateKeys) {
        if (duplicateSet.has(key)) {
          throw new Error(`Duplicate environment variable detected: ${key}`);
        }
        duplicateSet.add(key);
      }
      const payload = {
        envVariables: sanitizedEntries
          .filter((entry) => entry.key !== '')
          .map((entry) => ({
            key: entry.key,
            value: entry.value,
          })),
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
        const errorText = await response.text();
        throw new Error(
          `Failed to save environment variables: ${String(response.status)} ${response.statusText} ${errorText}`,
        );
      }
      const result = await response.json();
      let envRecord = null;
      if (isRecord(result) && 'env' in result && isRecord(result.env)) {
        const envValue = result.env;
        if (isRecord(envValue)) {
          envRecord = envValue;
        }
      }
      const updatedMetadata = {
        ...(userMetadata ?? {}),
        env: envRecord ?? {},
      };
      setUserMetadataStore(updatedMetadata);
      const extracted = extractEnvEntriesFromMetadata(updatedMetadata);
      const hasEmpty = extracted.some(
        (entry) => entry.key.trim() === '' && entry.value.trim() === '',
      );
      const entriesWithEmpty = hasEmpty
        ? extracted
        : [...extracted, createEmptyEnvEntry()];
      setEnvEntries(entriesWithEmpty);
      setOriginalEnvEntries(entriesWithEmpty);
      setEditingEntryIds(new Set());
      setEnvSuccessMessage('Environment variables saved successfully');
    } catch (envSaveError) {
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
    resetTokenState();
    resetEnvState();
  };
  const handleInputChange = (value) => {
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
  return _jsx(_Fragment, {
    children: _jsxs('div', {
      className: 'relative',
      children: [
        _jsxs('button', {
          onClick: () => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setActivePanel('home');
            }
          },
          className:
            'flex items-center gap-2 hover:opacity-80 transition-opacity',
          children: [
            _jsx('div', {
              className:
                'w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold',
              children:
                user?.name?.charAt(0).toUpperCase() ??
                user?.email?.charAt(0).toUpperCase() ??
                'U',
            }),
            _jsxs('span', {
              className: 'text-gray-300 text-sm',
              children: [
                'Hi,',
                ' ',
                _jsx('span', {
                  className: 'font-medium text-white',
                  children: user?.name ?? user?.email ?? 'User',
                }),
              ],
            }),
            _jsx('svg', {
              className: `w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`,
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              children: _jsx('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M19 9l-7 7-7-7',
              }),
            }),
          ],
        }),
        isOpen &&
          _jsxs(_Fragment, {
            children: [
              _jsx('div', {
                className: 'fixed inset-0 z-40',
                onClick: () => {
                  setIsOpen(false);
                  closePanel();
                },
              }),
              _jsx('div', {
                className:
                  'absolute right-0 top-12 w-auto min-w-[380px] max-w-2xl bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50',
                children:
                  activePanel === 'home'
                    ? _jsxs('div', {
                        className: 'p-2',
                        children: [
                          _jsxs('div', {
                            className: 'px-3 py-2 border-b border-gray-700',
                            children: [
                              _jsx('p', {
                                className: 'text-sm font-medium text-white',
                                children: user?.name ?? user?.email ?? 'User',
                              }),
                              _jsx('p', {
                                className: 'text-xs text-gray-400 mt-1',
                                children: user?.email ?? 'No email',
                              }),
                            ],
                          }),
                          _jsxs('button', {
                            onClick: () => {
                              resetTokenState();
                              setActivePanel('githubToken');
                            },
                            className:
                              'w-full flex items-center gap-3 px-3 py-2 mt-1 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left',
                            children: [
                              _jsx('svg', {
                                className: 'w-5 h-5',
                                fill: 'none',
                                stroke: 'currentColor',
                                viewBox: '0 0 24 24',
                                children: _jsx('path', {
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                  strokeWidth: 2,
                                  d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
                                }),
                              }),
                              githubToken !== null && githubToken !== ''
                                ? 'Manage GitHub Token'
                                : 'Add GitHub Token',
                            ],
                          }),
                          _jsxs('button', {
                            onClick: () => {
                              resetEnvState();
                              setActivePanel('env');
                            },
                            className:
                              'w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left',
                            children: [
                              _jsx('svg', {
                                className: 'w-5 h-5',
                                fill: 'none',
                                stroke: 'currentColor',
                                viewBox: '0 0 24 24',
                                children: _jsx('path', {
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                  strokeWidth: 2,
                                  d: 'M12 4v16m8-8H4',
                                }),
                              }),
                              'Environment Variables',
                            ],
                          }),
                          _jsxs('button', {
                            onClick: logout,
                            className:
                              'w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left',
                            children: [
                              _jsx('svg', {
                                className: 'w-5 h-5',
                                fill: 'none',
                                stroke: 'currentColor',
                                viewBox: '0 0 24 24',
                                children: _jsx('path', {
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                  strokeWidth: 2,
                                  d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
                                }),
                              }),
                              'Logout',
                            ],
                          }),
                        ],
                      })
                    : activePanel === 'githubToken'
                      ? _jsxs(_Fragment, {
                          children: [
                            _jsxs('div', {
                              className:
                                'p-4 border-b border-gray-700 flex items-center justify-between',
                              children: [
                                _jsxs('button', {
                                  onClick: () => {
                                    setActivePanel('home');
                                    resetTokenState();
                                  },
                                  className:
                                    'flex items-center gap-2 text-gray-400 hover:text-white transition-colors',
                                  children: [
                                    _jsx('svg', {
                                      className: 'w-4 h-4',
                                      fill: 'none',
                                      stroke: 'currentColor',
                                      viewBox: '0 0 24 24',
                                      children: _jsx('path', {
                                        strokeLinecap: 'round',
                                        strokeLinejoin: 'round',
                                        strokeWidth: 2,
                                        d: 'M15 19l-7-7 7-7',
                                      }),
                                    }),
                                    'Back',
                                  ],
                                }),
                                _jsx('h2', {
                                  className: 'text-lg font-semibold text-white',
                                  children: 'Manage Token',
                                }),
                                _jsx('div', { className: 'w-16' }),
                              ],
                            }),
                            _jsxs('div', {
                              className: 'p-4 space-y-4',
                              children: [
                                _jsxs('div', {
                                  children: [
                                    _jsxs('div', {
                                      className:
                                        'flex items-center justify-between mb-2',
                                      children: [
                                        _jsx('label', {
                                          htmlFor: 'github-token-input',
                                          className:
                                            'block text-sm font-medium text-gray-300',
                                          children:
                                            'GitHub Personal Access Token',
                                        }),
                                        showSavedIndicator &&
                                          _jsxs('span', {
                                            className:
                                              'flex items-center text-xs text-green-400 animate-fade-out',
                                            children: [
                                              _jsx('svg', {
                                                className: 'w-4 h-4 mr-1',
                                                fill: 'currentColor',
                                                viewBox: '0 0 20 20',
                                                children: _jsx('path', {
                                                  fillRule: 'evenodd',
                                                  d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                                                  clipRule: 'evenodd',
                                                }),
                                              }),
                                              'Saved',
                                            ],
                                          }),
                                      ],
                                    }),
                                    _jsxs('div', {
                                      className: 'flex gap-2',
                                      children: [
                                        _jsx('input', {
                                          ref: inputRef,
                                          id: 'github-token-input',
                                          type: showToken ? 'text' : 'password',
                                          value: inputValue,
                                          onChange: (e) => {
                                            handleInputChange(e.target.value);
                                          },
                                          placeholder: isLoading
                                            ? 'Loading...'
                                            : 'ghp_xxxxxxxxxxxxxxxxxxxx',
                                          disabled:
                                            isLoading || isSaving || isDeleting,
                                          className:
                                            'flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                                        }),
                                        _jsx('button', {
                                          type: 'button',
                                          onClick: () => {
                                            setShowToken(!showToken);
                                          },
                                          className:
                                            'px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors text-sm',
                                          disabled:
                                            isLoading ||
                                            githubToken === null ||
                                            githubToken === '',
                                          children: showToken
                                            ? _jsx('svg', {
                                                className: 'w-5 h-5',
                                                fill: 'none',
                                                stroke: 'currentColor',
                                                viewBox: '0 0 24 24',
                                                children: _jsx('path', {
                                                  strokeLinecap: 'round',
                                                  strokeLinejoin: 'round',
                                                  strokeWidth: 2,
                                                  d: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21',
                                                }),
                                              })
                                            : _jsxs('svg', {
                                                className: 'w-5 h-5',
                                                fill: 'none',
                                                stroke: 'currentColor',
                                                viewBox: '0 0 24 24',
                                                children: [
                                                  _jsx('path', {
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round',
                                                    strokeWidth: 2,
                                                    d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                                                  }),
                                                  _jsx('path', {
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round',
                                                    strokeWidth: 2,
                                                    d: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
                                                  }),
                                                ],
                                              }),
                                        }),
                                      ],
                                    }),
                                    error !== null &&
                                      error !== '' &&
                                      _jsxs('div', {
                                        className:
                                          'mt-2 p-2 bg-red-900/50 border border-red-700 rounded-md flex items-start',
                                        children: [
                                          _jsx('svg', {
                                            className:
                                              'w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5',
                                            fill: 'currentColor',
                                            viewBox: '0 0 20 20',
                                            children: _jsx('path', {
                                              fillRule: 'evenodd',
                                              d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
                                              clipRule: 'evenodd',
                                            }),
                                          }),
                                          _jsx('span', {
                                            className: 'text-sm text-red-300',
                                            children: error,
                                          }),
                                        ],
                                      }),
                                    successMessage !== null &&
                                      successMessage !== '' &&
                                      _jsxs('div', {
                                        className:
                                          'mt-2 p-2 bg-green-900/50 border border-green-700 rounded-md flex items-center',
                                        children: [
                                          _jsx('svg', {
                                            className:
                                              'w-5 h-5 text-green-400 mr-2',
                                            fill: 'currentColor',
                                            viewBox: '0 0 20 20',
                                            children: _jsx('path', {
                                              fillRule: 'evenodd',
                                              d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                                              clipRule: 'evenodd',
                                            }),
                                          }),
                                          _jsx('span', {
                                            className: 'text-sm text-green-300',
                                            children: successMessage,
                                          }),
                                        ],
                                      }),
                                    _jsx('div', {
                                      className:
                                        'mt-2 text-xs text-gray-500 space-y-1',
                                      children: _jsxs('p', {
                                        children: [
                                          _jsx('a', {
                                            href: 'https://github.com/settings/personal-access-tokens',
                                            target: '_blank',
                                            rel: 'noopener noreferrer',
                                            className:
                                              'text-indigo-400 hover:text-indigo-300 underline',
                                            children:
                                              'Create a fine-grained personal access token',
                                          }),
                                          ' ',
                                          'with',
                                          ' ',
                                          _jsx('span', {
                                            className: 'text-gray-400',
                                            children: 'Read and Write',
                                          }),
                                          ' ',
                                          'permissions for',
                                          ' ',
                                          _jsx('span', {
                                            className: 'text-gray-400',
                                            children: 'Contents',
                                          }),
                                          '.',
                                        ],
                                      }),
                                    }),
                                  ],
                                }),
                                hasChanges &&
                                  _jsxs('div', {
                                    className: 'flex gap-2',
                                    children: [
                                      _jsx('button', {
                                        onClick: handleSave,
                                        disabled:
                                          isSaving ||
                                          isLoading ||
                                          inputValue.trim() === '',
                                        className:
                                          'flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                        children: isSaving
                                          ? _jsxs(_Fragment, {
                                              children: [
                                                _jsxs('svg', {
                                                  className:
                                                    'animate-spin -ml-1 mr-2 h-4 w-4 text-white',
                                                  xmlns:
                                                    'http://www.w3.org/2000/svg',
                                                  fill: 'none',
                                                  viewBox: '0 0 24 24',
                                                  children: [
                                                    _jsx('circle', {
                                                      className: 'opacity-25',
                                                      cx: '12',
                                                      cy: '12',
                                                      r: '10',
                                                      stroke: 'currentColor',
                                                      strokeWidth: '4',
                                                    }),
                                                    _jsx('path', {
                                                      className: 'opacity-75',
                                                      fill: 'currentColor',
                                                      d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                                                    }),
                                                  ],
                                                }),
                                                'Saving...',
                                              ],
                                            })
                                          : 'Save Changes',
                                      }),
                                      _jsx('button', {
                                        onClick: handleCancel,
                                        disabled: isSaving || isLoading,
                                        className:
                                          'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                        children: 'Cancel',
                                      }),
                                    ],
                                  }),
                                githubToken !== null &&
                                  githubToken !== '' &&
                                  !hasChanges &&
                                  !showDeleteConfirm &&
                                  _jsxs('button', {
                                    onClick: () => {
                                      setShowDeleteConfirm(true);
                                    },
                                    disabled: isDeleting || isLoading,
                                    className:
                                      'w-full flex items-center justify-center px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/50 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                    children: [
                                      _jsx('svg', {
                                        className: 'w-4 h-4 mr-2',
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                                        }),
                                      }),
                                      'Delete Token',
                                    ],
                                  }),
                                showDeleteConfirm &&
                                  _jsxs('div', {
                                    className:
                                      'p-3 bg-red-900/20 border border-red-600/50 rounded-md',
                                    children: [
                                      _jsx('p', {
                                        className: 'text-sm text-red-300 mb-3',
                                        children:
                                          'Are you sure you want to delete your GitHub token? This action cannot be undone.',
                                      }),
                                      _jsxs('div', {
                                        className: 'flex gap-2',
                                        children: [
                                          _jsx('button', {
                                            onClick: handleDelete,
                                            disabled: isDeleting,
                                            className:
                                              'flex-1 flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                            children: isDeleting
                                              ? _jsxs(_Fragment, {
                                                  children: [
                                                    _jsxs('svg', {
                                                      className:
                                                        'animate-spin -ml-1 mr-2 h-4 w-4',
                                                      xmlns:
                                                        'http://www.w3.org/2000/svg',
                                                      fill: 'none',
                                                      viewBox: '0 0 24 24',
                                                      children: [
                                                        _jsx('circle', {
                                                          className:
                                                            'opacity-25',
                                                          cx: '12',
                                                          cy: '12',
                                                          r: '10',
                                                          stroke:
                                                            'currentColor',
                                                          strokeWidth: '4',
                                                        }),
                                                        _jsx('path', {
                                                          className:
                                                            'opacity-75',
                                                          fill: 'currentColor',
                                                          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                                                        }),
                                                      ],
                                                    }),
                                                    'Deleting...',
                                                  ],
                                                })
                                              : 'Yes, Delete',
                                          }),
                                          _jsx('button', {
                                            onClick: () => {
                                              setShowDeleteConfirm(false);
                                            },
                                            disabled: isDeleting,
                                            className:
                                              'flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                            children: 'Cancel',
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                              ],
                            }),
                          ],
                        })
                      : _jsxs(_Fragment, {
                          children: [
                            _jsxs('div', {
                              className:
                                'p-4 border-b border-gray-700 flex items-center justify-between',
                              children: [
                                _jsxs('button', {
                                  onClick: () => {
                                    setActivePanel('home');
                                    handleEnvCancel();
                                  },
                                  className:
                                    'flex items-center gap-2 text-gray-400 hover:text-white transition-colors',
                                  children: [
                                    _jsx('svg', {
                                      className: 'w-4 h-4',
                                      fill: 'none',
                                      stroke: 'currentColor',
                                      viewBox: '0 0 24 24',
                                      children: _jsx('path', {
                                        strokeLinecap: 'round',
                                        strokeLinejoin: 'round',
                                        strokeWidth: 2,
                                        d: 'M15 19l-7-7 7-7',
                                      }),
                                    }),
                                    'Back',
                                  ],
                                }),
                                _jsx('h2', {
                                  className: 'text-lg font-semibold text-white',
                                  children: 'Environment Variables',
                                }),
                                _jsx('div', { className: 'w-16' }),
                              ],
                            }),
                            _jsxs('div', {
                              className: 'p-4 space-y-4',
                              children: [
                                _jsx('div', {
                                  className: 'p-3 border-b border-gray-700',
                                  children: _jsxs('p', {
                                    className:
                                      'text-sm text-gray-400 text-justify leading-relaxed',
                                    children: [
                                      'These values are available via',
                                      ' ',
                                      _jsx('span', {
                                        className: 'text-indigo-300 font-mono',
                                        children: '[[USE_USER_ENV(key)]]',
                                      }),
                                      '. Paste one or more',
                                      ' ',
                                      _jsx('span', {
                                        className: 'font-mono',
                                        children: 'NAME=VALUE',
                                      }),
                                      ' entries to auto-create rows.',
                                    ],
                                  }),
                                }),
                                envError !== null &&
                                  envError !== '' &&
                                  _jsxs('div', {
                                    className:
                                      'p-2 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-300 flex items-start',
                                    children: [
                                      _jsx('svg', {
                                        className:
                                          'w-5 h-5 text-red-400 mr-2 flex-shrink-0',
                                        fill: 'currentColor',
                                        viewBox: '0 0 20 20',
                                        children: _jsx('path', {
                                          fillRule: 'evenodd',
                                          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
                                          clipRule: 'evenodd',
                                        }),
                                      }),
                                      _jsx('span', { children: envError }),
                                    ],
                                  }),
                                envSuccessMessage !== null &&
                                  envSuccessMessage !== '' &&
                                  _jsxs('div', {
                                    className:
                                      'p-2 bg-green-900/40 border border-green-600 rounded-md text-sm text-green-300 flex items-center',
                                    children: [
                                      _jsx('svg', {
                                        className:
                                          'w-5 h-5 text-green-400 mr-2',
                                        fill: 'currentColor',
                                        viewBox: '0 0 20 20',
                                        children: _jsx('path', {
                                          fillRule: 'evenodd',
                                          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                                          clipRule: 'evenodd',
                                        }),
                                      }),
                                      _jsx('span', {
                                        children: envSuccessMessage,
                                      }),
                                    ],
                                  }),
                                _jsxs('div', {
                                  className: 'space-y-4',
                                  children: [
                                    _jsxs('div', {
                                      className:
                                        'border border-gray-700 rounded-md p-4',
                                      children: [
                                        _jsxs('div', {
                                          className:
                                            'grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center pb-3 px-1 border-b border-gray-700 mb-3',
                                          children: [
                                            _jsx('label', {
                                              className:
                                                'text-xs font-medium text-gray-400 uppercase tracking-wide text-left',
                                              children: 'Key',
                                            }),
                                            _jsx('label', {
                                              className:
                                                'text-xs font-medium text-gray-400 uppercase tracking-wide text-left',
                                              children: 'Value',
                                            }),
                                            _jsx('div', { className: 'w-20' }),
                                          ],
                                        }),
                                        _jsx('div', {
                                          className:
                                            'space-y-2 max-h-64 overflow-y-auto px-1',
                                          children: (() => {
                                            const editableEntries =
                                              envEntries.filter(
                                                (entry) =>
                                                  entry.isSaved !== true ||
                                                  editingEntryIds.has(entry.id),
                                              );
                                            return _jsx(_Fragment, {
                                              children: editableEntries.map(
                                                (entry) => {
                                                  return _jsxs(
                                                    'div',
                                                    {
                                                      className:
                                                        'env-row grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center',
                                                      children: [
                                                        _jsx('input', {
                                                          value: entry.key,
                                                          onChange: (e) => {
                                                            updateEnvEntry(
                                                              entry.id,
                                                              'key',
                                                              e.target.value,
                                                            );
                                                          },
                                                          onPaste: (event) => {
                                                            handleEnvKeyPaste(
                                                              event,
                                                              entry.id,
                                                            );
                                                          },
                                                          onKeyDown: (e) => {
                                                            if (
                                                              e.key === 'Enter'
                                                            ) {
                                                              e.preventDefault();
                                                            } else if (
                                                              e.key ===
                                                                'Backspace' &&
                                                              entry.key ===
                                                                '' &&
                                                              entry.value ===
                                                                '' &&
                                                              editableEntries.length >
                                                                1
                                                            ) {
                                                              e.preventDefault();
                                                              const currentIndex =
                                                                editableEntries.findIndex(
                                                                  (e) =>
                                                                    e.id ===
                                                                    entry.id,
                                                                );
                                                              if (
                                                                currentIndex > 0
                                                              ) {
                                                                const valueInputs =
                                                                  document.querySelectorAll(
                                                                    'input[name="apiValue"]',
                                                                  );
                                                                if (
                                                                  currentIndex -
                                                                    1 <
                                                                  valueInputs.length
                                                                ) {
                                                                  const prevInput =
                                                                    valueInputs[
                                                                      currentIndex -
                                                                        1
                                                                    ];
                                                                  prevInput.focus();
                                                                }
                                                                setTimeout(
                                                                  () => {
                                                                    const envRows =
                                                                      document.querySelectorAll(
                                                                        '.env-row',
                                                                      );
                                                                    if (
                                                                      envRows.length >
                                                                      0
                                                                    ) {
                                                                      const lastRow =
                                                                        envRows[
                                                                          envRows.length -
                                                                            1
                                                                        ];
                                                                      lastRow.remove();
                                                                    }
                                                                  },
                                                                  0,
                                                                );
                                                              }
                                                              removeEnvEntry(
                                                                entry.id,
                                                              );
                                                            }
                                                          },
                                                          name: 'apiKey',
                                                          placeholder:
                                                            'API_KEY',
                                                          className:
                                                            'px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full text-left',
                                                          autoComplete: 'off',
                                                        }),
                                                        _jsx('input', {
                                                          value: entry.value,
                                                          onChange: (e) => {
                                                            updateEnvEntry(
                                                              entry.id,
                                                              'value',
                                                              e.target.value,
                                                            );
                                                          },
                                                          onKeyDown: (e) => {
                                                            if (
                                                              e.key === 'Enter'
                                                            ) {
                                                              e.preventDefault();
                                                              const hasEmpty =
                                                                editableEntries.some(
                                                                  (e) =>
                                                                    e.key.trim() ===
                                                                      '' &&
                                                                    e.value.trim() ===
                                                                      '',
                                                                );
                                                              if (!hasEmpty) {
                                                                addEnvEntry();
                                                              }
                                                              setTimeout(() => {
                                                                {
                                                                  const keyInputs =
                                                                    document.querySelectorAll(
                                                                      'input[name="apiKey"]',
                                                                    );
                                                                  if (
                                                                    keyInputs.length >
                                                                    0
                                                                  ) {
                                                                    keyInputs[
                                                                      keyInputs.length -
                                                                        1
                                                                    ].focus();
                                                                  }
                                                                }
                                                              }, 0);
                                                            } else if (
                                                              e.key ===
                                                                'Backspace' &&
                                                              entry.key ===
                                                                '' &&
                                                              entry.value ===
                                                                '' &&
                                                              editableEntries.length >
                                                                1
                                                            ) {
                                                              e.preventDefault();
                                                              const currentIndex =
                                                                editableEntries.findIndex(
                                                                  (e) =>
                                                                    e.id ===
                                                                    entry.id,
                                                                );
                                                              removeEnvEntry(
                                                                entry.id,
                                                              );
                                                              if (
                                                                currentIndex > 0
                                                              ) {
                                                                setTimeout(
                                                                  () => {
                                                                    const valueInputs =
                                                                      document.querySelectorAll(
                                                                        'input[name="apiValue"]',
                                                                      );
                                                                    if (
                                                                      currentIndex -
                                                                        1 <
                                                                      valueInputs.length
                                                                    ) {
                                                                      const prevInput =
                                                                        valueInputs[
                                                                          currentIndex -
                                                                            1
                                                                        ];
                                                                      prevInput.focus();
                                                                    }
                                                                  },
                                                                  0,
                                                                );
                                                              }
                                                            }
                                                          },
                                                          name: 'apiValue',
                                                          placeholder: 'Value',
                                                          className:
                                                            'px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full text-left',
                                                        }),
                                                        _jsx('div', {
                                                          className: 'w-5',
                                                        }),
                                                      ],
                                                    },
                                                    entry.id,
                                                  );
                                                },
                                              ),
                                            });
                                          })(),
                                        }),
                                      ],
                                    }),
                                    (() => {
                                      const savedEntries = envEntries.filter(
                                        (entry) =>
                                          entry.isSaved === true &&
                                          !editingEntryIds.has(entry.id),
                                      );
                                      if (savedEntries.length === 0) {
                                        return null;
                                      }
                                      return _jsxs('div', {
                                        className:
                                          'border border-gray-700 rounded-md p-4',
                                        children: [
                                          _jsxs('div', {
                                            className:
                                              'grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center pb-3 px-1 border-b border-gray-700 mb-3',
                                            children: [
                                              _jsx('label', {
                                                className:
                                                  'text-xs font-medium text-gray-400 uppercase tracking-wide text-left',
                                                children: 'Key',
                                              }),
                                              _jsx('label', {
                                                className:
                                                  'text-xs font-medium text-gray-400 uppercase tracking-wide text-left',
                                                children: 'Value',
                                              }),
                                              _jsx('div', {
                                                className: 'w-20',
                                              }),
                                            ],
                                          }),
                                          _jsx('div', {
                                            className:
                                              'space-y-2 max-h-64 overflow-y-auto px-1',
                                            children: savedEntries.map(
                                              (entry) =>
                                                _jsxs(
                                                  'div',
                                                  {
                                                    className:
                                                      'grid grid-cols-[calc(50%-0.375rem),calc(50%-0.375rem),auto] gap-3 items-center',
                                                    children: [
                                                      _jsx('div', {
                                                        className:
                                                          'px-3 py-2 text-gray-300 text-sm min-h-[2.5rem] flex items-center text-left',
                                                        children: entry.key,
                                                      }),
                                                      _jsx('div', {
                                                        className:
                                                          'px-3 py-2 text-gray-300 text-sm min-h-[2.5rem] flex items-center text-left',
                                                        children: entry.value,
                                                      }),
                                                      _jsx('div', {
                                                        className:
                                                          'flex gap-1 items-center h-[2.5rem]',
                                                        children: _jsx(
                                                          'button',
                                                          {
                                                            type: 'button',
                                                            onClick: (e) => {
                                                              const rect =
                                                                e.currentTarget.getBoundingClientRect();
                                                              setContextMenu({
                                                                x:
                                                                  rect.right -
                                                                  120,
                                                                y:
                                                                  rect.bottom +
                                                                  4,
                                                                entryId:
                                                                  entry.id,
                                                              });
                                                            },
                                                            className:
                                                              'p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors',
                                                            title:
                                                              'More options',
                                                            children: _jsx(
                                                              'svg',
                                                              {
                                                                className:
                                                                  'w-4 h-4',
                                                                fill: 'none',
                                                                stroke:
                                                                  'currentColor',
                                                                viewBox:
                                                                  '0 0 24 24',
                                                                children: _jsx(
                                                                  'path',
                                                                  {
                                                                    strokeLinecap:
                                                                      'round',
                                                                    strokeLinejoin:
                                                                      'round',
                                                                    strokeWidth: 2,
                                                                    d: 'M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z',
                                                                  },
                                                                ),
                                                              },
                                                            ),
                                                          },
                                                        ),
                                                      }),
                                                    ],
                                                  },
                                                  entry.id,
                                                ),
                                            ),
                                          }),
                                        ],
                                      });
                                    })(),
                                  ],
                                }),
                                contextMenu !== null &&
                                  _jsx(ContextMenu, {
                                    x: contextMenu.x,
                                    y: contextMenu.y,
                                    menuItems: [
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
                                    ],
                                    onClose: () => {
                                      setContextMenu(null);
                                    },
                                    appendToBody: true,
                                  }),
                                _jsx('button', {
                                  onClick: () => {
                                    void saveEnvironmentVariables();
                                  },
                                  disabled: isEnvSaving || !isEnvDirty,
                                  className:
                                    'w-full flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                                  children: isEnvSaving
                                    ? _jsxs(_Fragment, {
                                        children: [
                                          _jsxs('svg', {
                                            className:
                                              'animate-spin -ml-1 mr-2 h-4 w-4 text-white',
                                            xmlns: 'http://www.w3.org/2000/svg',
                                            fill: 'none',
                                            viewBox: '0 0 24 24',
                                            children: [
                                              _jsx('circle', {
                                                className: 'opacity-25',
                                                cx: '12',
                                                cy: '12',
                                                r: '10',
                                                stroke: 'currentColor',
                                                strokeWidth: '4',
                                              }),
                                              _jsx('path', {
                                                className: 'opacity-75',
                                                fill: 'currentColor',
                                                d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                                              }),
                                            ],
                                          }),
                                          'Saving...',
                                        ],
                                      })
                                    : 'Save Environment Variables',
                                }),
                              ],
                            }),
                          ],
                        }),
              }),
            ],
          }),
      ],
    }),
  });
}
