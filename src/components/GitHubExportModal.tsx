import { useState, useEffect } from 'react';
import CustomModal from '@/components/Modal/base/CustomModal.tsx';
import { getApiUrl } from '@/utils/getApiUrl.ts';

interface IExportOption {
  method: 'personal_token' | 'github_app' | 'existing_repo';
  available: boolean;
  recommended: boolean;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  action?: {
    type: 'has_token' | 'needs_token' | 'needs_install' | 'needs_repo_url';
    url?: string;
    message?: string;
  };
}

interface IExportOptionsResponse {
  owner: string;
  ownerType: 'User' | 'Organization' | 'unknown';
  hasPersonalToken: boolean;
  hasGitHubAppInstalled: boolean;
  options: IExportOption[];
}

interface IGitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  accessToken: string;
  onSelectMethod: (
    method: 'personal_token' | 'github_app' | 'existing_repo',
    tokenOrRepoUrl?: string,
  ) => void;
  onSaveToken?: (token: string) => Promise<void>;
  onDownloadZip: () => void;
  fileCount: number;
}

function GitHubExportModal({
  isOpen,
  onClose,
  owner,
  accessToken,
  onSelectMethod,
  onSaveToken,
  onDownloadZip,
  fileCount,
}: IGitHubExportModalProps) {
  const [options, setOptions] = useState<IExportOptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<
    'personal_token' | 'github_app' | 'existing_repo' | null
  >(null);
  const [tokenInput, setTokenInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isWaitingForInstall, setIsWaitingForInstall] = useState(false);

  useEffect(() => {
    if (!isOpen || owner === '') {
      return;
    }

    const fetchOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${getApiUrl()}/check-github-export-options`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ owner }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch export options');
        }

        const data: unknown = await response.json();

        function isExportOptionsResponse(
          obj: unknown,
        ): obj is IExportOptionsResponse {
          return (
            typeof obj === 'object' &&
            obj !== null &&
            'options' in obj &&
            'owner' in obj &&
            'ownerType' in obj
          );
        }

        if (isExportOptionsResponse(data)) {
          setOptions(data);

          /* Auto-select recommended method */
          const recommendedOption = data.options.find((o) => o.recommended);
          if (recommendedOption !== undefined) {
            setSelectedMethod(recommendedOption.method);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOptions();
  }, [isOpen, owner, accessToken]);

  const handleSaveToken = async () => {
    if (tokenInput.trim() === '' || onSaveToken === undefined) {
      return;
    }

    setIsSavingToken(true);
    try {
      await onSaveToken(tokenInput.trim());
      onSelectMethod('personal_token', tokenInput.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save token');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleInstallApp = (installUrl: string) => {
    window.open(installUrl, '_blank');
    setIsWaitingForInstall(true);

    /* Poll for installation */
    const pollInterval = setInterval(() => {
      const checkInstallation = async () => {
        try {
          const response = await fetch(
            `${getApiUrl()}/check-github-app-installation`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ owner }),
            },
          );

          if (response.ok) {
            const data: unknown = await response.json();

            interface IInstallData {
              installed?: boolean;
            }

            function isInstallData(obj: unknown): obj is IInstallData {
              return (
                typeof obj === 'object' && obj !== null && 'installed' in obj
              );
            }

            if (isInstallData(data) && data.installed === true) {
              clearInterval(pollInterval);
              setIsWaitingForInstall(false);
              onSelectMethod('github_app');
            }
          }
        } catch {
          /* Continue polling */
        }
      };

      checkInstallation().catch(() => {
        /* Continue polling */
      });
    }, 2000);

    /* Clear after 5 minutes */
    setTimeout(
      () => {
        clearInterval(pollInterval);
        setIsWaitingForInstall(false);
      },
      5 * 60 * 1000,
    );
  };

  const renderOptionCard = (option: IExportOption) => {
    const isExistingRepo = option.method === 'existing_repo';
    const isSelected = selectedMethod === option.method;
    const isPAT = option.method === 'personal_token';
    /* existing_repo is only selectable when app is installed */
    const isExistingRepoSelectable =
      isExistingRepo && option.action?.type === 'needs_repo_url';

    return (
      <button
        type="button"
        key={option.method}
        className={`
          relative p-5 rounded-xl border-2 transition-all duration-200 w-full text-left
          ${
            isSelected
              ? 'border-gray-600 bg-gray-600/10 shadow-lg shadow-gray-600/20 cursor-pointer'
              : isExistingRepo && !isExistingRepoSelectable
                ? 'border-gray-700 bg-gray-800/30 cursor-default'
                : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 cursor-pointer'
          }
          ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => {
          if (
            option.available &&
            (!isExistingRepo || isExistingRepoSelectable)
          ) {
            setSelectedMethod(option.method);
          }
        }}
        disabled={
          !option.available || (isExistingRepo && !isExistingRepoSelectable)
        }
      >
        {/* Recommended badge */}
        {option.recommended && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-lg">
            Recommended
          </span>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-xl
            ${isPAT ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}
          `}
          >
            {isPAT ? '🔑' : '🤖'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{option.label}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{option.description}</p>
          </div>
          {/* Selection indicator */}
          {(!isExistingRepo || isExistingRepoSelectable) && (
            <div
              className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${isSelected ? 'border-gray-600 bg-gray-600' : 'border-gray-500'}
            `}
            >
              {isSelected && (
                <svg
                  aria-hidden="true"
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          )}
          {isExistingRepo && !isExistingRepoSelectable && (
            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
              Install App First
            </span>
          )}
        </div>

        {/* Pros & Cons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <p className="text-xs font-medium text-emerald-400 mb-1.5 uppercase tracking-wide">
              Advantages
            </p>
            <ul className="space-y-1">
              {option.pros.map((pro) => (
                <li
                  key={pro}
                  className="flex items-start gap-1.5 text-xs text-gray-300"
                >
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-rose-400 mb-1.5 uppercase tracking-wide">
              Considerations
            </p>
            <ul className="space-y-1">
              {option.cons.map((con) => (
                <li
                  key={con}
                  className="flex items-start gap-1.5 text-xs text-gray-300"
                >
                  <span className="text-rose-400 mt-0.5">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action section - show when selected OR for informational cards */}
        {(isSelected || isExistingRepo) && option.action !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {option.action.type === 'has_token' && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{option.action.message}</span>
              </div>
            )}

            {option.action.type === 'needs_token' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">{option.action.message}</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                    }}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <a
                    href={option.action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                  >
                    Generate Token
                  </a>
                </div>
              </div>
            )}

            {option.action.type === 'needs_install' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">{option.action.message}</p>
                {isWaitingForInstall ? (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 animate-spin"
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
                    <span>Waiting for installation...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleInstallApp(option.action?.url ?? '');
                    }}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Install GitHub App
                  </button>
                )}
              </div>
            )}

            {option.action.type === 'needs_repo_url' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>GitHub App installed!</span>
                </div>

                {/* Repository URL input */}
                <div className="space-y-2">
                  <label
                    htmlFor="repo-url-input"
                    className="text-sm text-gray-300 font-medium"
                  >
                    Repository URL
                  </label>
                  <input
                    id="repo-url-input"
                    type="text"
                    value={repoUrlInput}
                    onChange={(e) => {
                      setRepoUrlInput(e.target.value);
                    }}
                    placeholder="https://github.com/username/repo-name"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Enter the URL of an existing repository you want to push
                    files to
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>

                {/* Create new repo link */}
                <div className="text-center">
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Create New Repository on GitHub
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </button>
    );
  };

  /* Validate GitHub URL format */
  const isValidGitHubRepoUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    return githubRegex.test(url.trim());
  };

  const canProceed = () => {
    if (selectedMethod === 'personal_token') {
      const patOption = options?.options.find(
        (o) => o.method === 'personal_token',
      );
      return (
        patOption?.action?.type === 'has_token' || tokenInput.trim() !== ''
      );
    }
    if (selectedMethod === 'github_app') {
      /* Only for organizations - GitHub App can create repos */
      const appOption = options?.options.find((o) => o.method === 'github_app');
      return appOption?.action?.type === 'has_token';
    }
    if (selectedMethod === 'existing_repo') {
      /* Can proceed if app is installed AND repo URL is valid */
      const existingRepoOption = options?.options.find(
        (o) => o.method === 'existing_repo',
      );
      return (
        existingRepoOption?.action?.type === 'needs_repo_url' &&
        isValidGitHubRepoUrl(repoUrlInput)
      );
    }
    return false;
  };

  const handleProceed = () => {
    if (selectedMethod === 'personal_token') {
      const patOption = options?.options.find(
        (o) => o.method === 'personal_token',
      );
      if (patOption?.action?.type === 'has_token') {
        onSelectMethod('personal_token');
      } else if (tokenInput.trim() !== '') {
        void handleSaveToken();
      }
    } else if (selectedMethod === 'github_app') {
      onSelectMethod('github_app');
    } else if (selectedMethod === 'existing_repo') {
      /* Pass the repo URL to the parent - it will handle pushing to existing repo */
      onSelectMethod('existing_repo', repoUrlInput.trim());
    }
  };

  const footer =
    !isLoading && options !== null ? (
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!canProceed() || isSavingToken}
          className={`
          px-6 py-2 rounded-lg font-medium transition-all
          ${
            canProceed() && !isSavingToken
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
        >
          {isSavingToken ? (
            <span className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="w-4 h-4 animate-spin"
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
            </span>
          ) : (
            'Continue Export'
          )}
        </button>
      </div>
    ) : null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export to GitHub"
      size="large"
      footer={footer}
    >
      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">
              Checking your GitHub configuration...
            </p>
          </div>
        )}

        {error !== null && (
          <div className="p-4 bg-gray-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {!isLoading && options !== null && (
          <div className="space-y-6">
            {/* Owner info */}
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                {options.ownerType === 'Organization' ? '🏢' : '👤'}
              </div>
              <div>
                <p className="text-white font-medium">{options.owner}</p>
                <p className="text-sm text-gray-400">
                  {options.ownerType === 'Organization'
                    ? 'Organization'
                    : 'Personal Account'}
                  {options.ownerType === 'User' && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                      Requires Personal Token
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Info banner for personal accounts */}
            {options.ownerType === 'User' && (
              <div className="p-4 bg-gray-600/10 border border-gray-600/30 rounded-lg">
                <div className="flex gap-3">
                  <span className="text-blue-400 text-xl">ℹ️</span>
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">
                      Why do personal accounts need a token?
                    </p>
                    <p className="text-blue-400/80">
                      GitHub Apps can only create repositories in{' '}
                      <strong>organizations</strong>, not personal accounts. For
                      personal accounts, you need a Personal Access Token to
                      create repositories.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-4">
              {options.options.map(renderOptionCard)}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Download ZIP option */}
            <button
              type="button"
              className="w-full text-left p-5 rounded-xl border-2 border-gray-600 hover:border-gray-500 bg-gray-800/50 cursor-pointer transition-all duration-200"
              onClick={() => {
                onDownloadZip();
                onClose();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-blue-500/20 text-blue-400">
                  📦
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    Download as ZIP
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Download {fileCount} file{fileCount !== 1 ? 's' : ''} to
                    your computer
                  </p>
                </div>
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>
    </CustomModal>
  );
}

export default GitHubExportModal;
