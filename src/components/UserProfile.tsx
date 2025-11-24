import { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface IUserProfileProps {
  onTokenUpdate?: (token: string) => void;
}

export default function UserProfile({ onTokenUpdate }: IUserProfileProps) {
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const [isOpen, setIsOpen] = useState(false);
  const [showTokenManagement, setShowTokenManagement] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGitHubToken = async () => {
      if (!user) {
        setIsLoadingToken(false);
        return;
      }

      try {
        const accessTokenResult = await getAccessTokenSilently({
          authorizationParams: {
            audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
          },
          cacheMode: 'on',
        });
        if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
          setIsLoadingToken(false);
          return;
        }

        const backendUrl = String(import.meta.env.VITE_BACKEND_URL ?? '');
        const response = await fetch(`${backendUrl}/github-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessTokenResult}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result: unknown = await response.json();
          interface ITokenResponse {
            success?: boolean;
            token?: string | null;
          }
          const isTokenResponse = (val: unknown): val is ITokenResponse => {
            return (
              typeof val === 'object' &&
              val !== null &&
              ('success' in val || 'token' in val)
            );
          };

          if (
            isTokenResponse(result) &&
            result.token !== null &&
            result.token !== undefined
          ) {
            setGithubToken(result.token);
            setInputValue(result.token);
            if (onTokenUpdate) {
              onTokenUpdate(result.token);
            }
          }
        }
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message.includes('Missing Refresh Token')
        ) {
          // Missing refresh token is expected on first load
        } else if (error instanceof Error) {
          const errorMessage = error.message;
          if (
            !errorMessage.includes('Missing Refresh Token') &&
            !errorMessage.includes('login_required')
          ) {
            console.error(`Failed to load GitHub token: ${errorMessage}`);
          }
        }
      } finally {
        setIsLoadingToken(false);
      }
    };

    void loadGitHubToken();
  }, [user, getAccessTokenSilently, onTokenUpdate]);

  const saveGitHubToken = async (token: string) => {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessTokenResult = await getAccessTokenSilently({
        authorizationParams: {
          audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
        },
        cacheMode: 'on',
      });
      if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
        throw new Error('Failed to get access token');
      }

      const backendUrl = String(import.meta.env.VITE_BACKEND_URL);
      const response = await fetch(`${backendUrl}/github-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessTokenResult}`,
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
    if (!user) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessTokenResult = await getAccessTokenSilently({
        authorizationParams: {
          audience: String(import.meta.env.VITE_AUTH0_AUDIENCE),
        },
        cacheMode: 'on',
      });
      if (typeof accessTokenResult !== 'string' || accessTokenResult === '') {
        throw new Error('Failed to get access token');
      }

      const backendUrl = String(import.meta.env.VITE_BACKEND_URL);
      const response = await fetch(`${backendUrl}/github-token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessTokenResult}`,
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

      setGithubToken('');
      setInputValue('');
      setHasChanges(false);
      setSuccessMessage('Token deleted successfully');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
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

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHasChanges(value !== githubToken);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = () => {
    const tokenValue = inputValue.trim();
    if (tokenValue !== '' && tokenValue !== githubToken) {
      void saveGitHubToken(tokenValue);
    }
  };

  const handleCancel = () => {
    setInputValue(githubToken);
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
      <div className="relative">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setShowTokenManagement(false);
            }
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() ??
              user?.email?.charAt(0).toUpperCase() ??
              'U'}
          </div>
          <span className="text-gray-300 text-sm">
            Hi,{' '}
            <span className="font-medium text-white">
              {user?.name ?? user?.email ?? 'User'}
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
                setShowTokenManagement(false);
                setHasChanges(false);
                setInputValue(githubToken);
                setError(null);
                setShowDeleteConfirm(false);
              }}
            />
            <div className="absolute right-0 top-12 w-auto min-w-[320px] max-w-md bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              {!showTokenManagement ? (
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-gray-700">
                    <p className="text-sm font-medium text-white">
                      {user?.name ?? user?.email ?? 'User'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user?.email ?? 'No email'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowTokenManagement(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    {githubToken ? 'Manage Token' : 'Add Token'}
                  </button>

                  <button
                    onClick={() => {
                      void logout({
                        logoutParams: { returnTo: window.location.origin },
                      });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-left"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
              ) : (
                <>
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setShowTokenManagement(false);
                        setHasChanges(false);
                        setInputValue(githubToken);
                        setError(null);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back
                    </button>
                    <h2 className="text-lg font-semibold text-white">
                      Manage Token
                    </h2>
                    <div className="w-16"></div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="github-token-input"
                          className="block text-sm font-medium text-gray-300"
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
                          placeholder={
                            isLoadingToken
                              ? 'Loading...'
                              : 'ghp_xxxxxxxxxxxxxxxxxxxx'
                          }
                          disabled={isLoadingToken || isSaving || isDeleting}
                          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowToken(!showToken);
                          }}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors text-sm"
                          disabled={isLoadingToken || !githubToken}
                        >
                          {showToken ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
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
                            >
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
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>
                          <a
                            href="https://github.com/settings/personal-access-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline"
                          >
                            Create a fine-grained personal access token
                          </a>{' '}
                          with{' '}
                          <span className="text-gray-400">Read and Write</span>{' '}
                          permissions for{' '}
                          <span className="text-gray-400">Contents</span>.
                        </p>
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={
                            isSaving ||
                            isLoadingToken ||
                            inputValue.trim() === ''
                          }
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
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
                          disabled={isSaving || isLoadingToken}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {githubToken && !hasChanges && !showDeleteConfirm && (
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                        }}
                        disabled={isDeleting || isLoadingToken}
                        className="w-full flex items-center justify-center px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/50 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
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
                            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
