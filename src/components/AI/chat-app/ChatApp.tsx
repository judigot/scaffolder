import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import App from '@/App.tsx';
import { AIChatContainer } from '@/components/AI/AIChatContainer.tsx';
import ChatPanel from '@/components/AI/chat-app/ChatPanel.tsx';
import ChatTree from '@/components/AI/chat-app/ChatTree.tsx';
import { mockRepositories } from '@/components/AI/chat-app/mockData.ts';
import OpenCodeWebView from '@/components/AI/chat-app/OpenCodeWebView.tsx';
import RepoTabs from '@/components/AI/chat-app/RepoTabs.tsx';
import TopNav from '@/components/AI/chat-app/TopNav.tsx';
import type { IMessage, IRepository } from '@/components/AI/chat-app/types.ts';
import {
  findChatInRepo,
  prepareCheckoutOptions,
} from '@/components/AI/chat-app/utils/chatCheckout.ts';
import {
  filterChatsWithContent,
  filterSprintsWithContent,
} from '@/components/AI/chat-app/utils/chatFilters.ts';
import { MODEL_OPTIONS, type ModelId } from '@/components/AI/modelOptions.ts';
import TabBar from '@/components/AI/TabBar.tsx';
import {
  BUILDER_TAB_CONFIG,
  CHAT_TAB_CONFIG,
} from '@/components/AI/tabBarConfig.tsx';
import { useCheckoutBranch } from '@/hooks/useCheckoutBranch.ts';
import useDebouncedValue from '@/hooks/useDebouncedValue.ts';
import { useDecryptedUserMetadata } from '@/hooks/useDecryptedUserMetadata.ts';
import { useLocalRepoFiles } from '@/hooks/useLocalRepoFiles.ts';
import {
  type IStoredRepository,
  useRepositories,
} from '@/hooks/useRepositories.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useUserFiles } from '@/hooks/useUserFiles.ts';
import { useWorktreeFiles } from '@/hooks/useWorktreeFiles.ts';
import {
  REPO_AGENT_SYSTEM_PROMPT,
  WORKTREE_AGENT_PROMPT,
} from '@/prompts/repoAgent.ts';
import { useRepositoriesStore, useScaffolderStore } from '@/stores/index.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';
import { useUIStore } from '@/useUIStore.ts';
import {
  removeHiddenSchemaFromText,
  validateSchemaInfoFromResponse,
} from '@/utils/schemaInfoValidator.ts';

// API response schemas for type-safe parsing
const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
});

const ChatMetadataSchema = z.object({
  chatId: z.string(),
  branch: z.string(),
  title: z.string(),
  description: z.string().optional(),
  prNumber: z.number().optional(),
  prTitle: z.string().optional(),
  prUrl: z.string().optional(),
  prStatus: z.enum(['draft', 'ready']).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(ChatMessageSchema),
});

const ChatsListResponseSchema = z.object({
  ok: z.boolean(),
  chats: z.array(
    z.object({
      worktreePath: z.string(),
      metadata: ChatMetadataSchema,
    }),
  ),
});

const CloneResponseSchema = z.object({
  ok: z.boolean(),
  repoPath: z.string().optional(),
  defaultBranch: z.string().optional(),
  authType: z.enum(['public', 'github-token']).optional(),
});

const ErrorResponseSchema = z.object({
  error: z.string().optional(),
  details: z.string().optional(),
});

const WorktreeCreateResponseSchema = z.object({
  ok: z.boolean(),
  worktreePath: z.string(),
  branch: z.string(),
});

const WorktreeValidationResponseSchema = z.object({
  valid: z.boolean(),
  commitCount: z.number(),
  error: z.string().optional(),
});

const AgentSessionResponseSchema = z.object({
  sessionId: z.string().optional(),
  assistantText: z.string().optional(),
});

const PostValidationResponseSchema = z.object({
  valid: z.boolean(),
  newCommits: z.number(),
  lastCommitMessage: z.string().optional(),
  branch: z.string().optional(),
  branchRenamed: z.boolean().optional(),
  worktreeRenamed: z.boolean().optional(),
  newWorktreePath: z.string().optional(),
});

const PullRequestResponseSchema = z.object({
  ok: z.boolean(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
});

function getErrorFromResponse(data: unknown, fallback: string): string {
  const result = ErrorResponseSchema.safeParse(data);
  if (result.success) {
    const details = result.data.details;
    const error = result.data.error;
    if (details !== undefined && details !== '') {
      return details;
    }
    if (error !== undefined && error !== '') {
      return error;
    }
  }
  return fallback;
}

/**
 * Convert stored repository (from Auth0) to full IRepository with local state
 */
function storedRepoToFullRepo(stored: IStoredRepository): IRepository {
  // Extract repo name from URL (e.g., "https://github.com/owner/repo" -> "repo")
  const match = /github\.com\/[\w.-]+\/([\w.-]+)/i.exec(stored.repoUrl);
  const repoName = match?.[1] ?? 'repository';

  // Create a stable ID from the URL
  const repoId = `repo-${stored.repoUrl.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return {
    id: repoId,
    name: repoName,
    path: stored.localPath ?? `~/projects/${repoName}`,
    localPath: stored.localPath,
    isRemovable: true,
    repoUrl: stored.repoUrl,
    sprints: [],
    chats: [],
  };
}

export default function ChatApp() {
  // ===== Auth =====
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  // ===== React Query =====
  const queryClient = useQueryClient();

  // ===== UI Store (global navigation) =====
  const { topLevelTab, activeTab, setActiveTab } = useUIStore();

  // ===== Scaffolder Store =====
  const {
    useLocalFiles: useLocalScaffolderFiles,
    setUseLocalFiles: setUseLocalScaffolderFiles,
    remoteFilesURL: remoteScaffolderURL,
    setRemoteFilesURL: setRemoteScaffolderURL,
  } = useScaffolderStore();

  // ===== Repositories Store =====
  const {
    repositories,
    setRepositories,
    activeRepoId,
    setActiveRepoId,
    activeSprintId,
    setActiveSprintId,
    activeChatId,
    setActiveChatId,
    activeChatScope,
    setActiveChatScope,
    initializeFromPersistedRepos,
    addRepository: addRepoToStore,
    removeRepository: removeRepoFromStore,
  } = useRepositoriesStore();

  // Determine if we're in scaffolder mode (used for file loading and UI decisions)
  const isScaffolderMode = topLevelTab === 'scaffolder';
  const isMasterMode = topLevelTab === 'master';
  const isOpencodeWebMode = topLevelTab === 'opencode-web';

  // ===== Multi-repo chat state =====
  // Get persisted repos from Auth0
  const {
    repositories: storedRepos,
    addRepository: persistRepository,
    removeRepository: persistRemoveRepository,
  } = useRepositories();

  // Branch checkout hook
  const { checkout } = useCheckoutBranch();

  // Convert stored repos to full IRepository objects
  // Always include mock data as demo reference, plus user's saved repos
  const persistedRepositories = useMemo(() => {
    const userRepos = storedRepos.map(storedRepoToFullRepo);
    // Mock data always first as demo reference
    return [...mockRepositories, ...userRepos];
  }, [storedRepos]);

  // Initialize store from persisted repos when they change
  useEffect(() => {
    if (persistedRepositories.length > 0) {
      initializeFromPersistedRepos(persistedRepositories);
    }
  }, [persistedRepositories, initializeFromPersistedRepos]);

  // Initialize activeRepoId on first render if not set
  useEffect(() => {
    if (activeRepoId === null && mockRepositories[0]?.id) {
      setActiveRepoId(mockRepositories[0].id);
      setActiveSprintId(mockRepositories[0].sprints[0]?.id ?? null);
    }
  }, [activeRepoId, setActiveRepoId, setActiveSprintId]);

  // Track if we've loaded chats for each repo to prevent infinite loops
  const loadedReposRef = useRef<Set<string>>(new Set());

  // Function to load chats from filesystem
  const loadChatsFromFilesystem = useCallback(
    async (repoId: string, repoPath: string) => {
      console.log(`[ChatApp] Loading chats from filesystem for ${repoId}`);

      try {
        const token = await getAccessTokenSilently();
        const response = await fetch('/api/worktree/scan-chats', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repoPath,
          }),
        });

        if (response.ok) {
          const jsonData: unknown = await response.json();
          const parseResult = ChatsListResponseSchema.safeParse(jsonData);

          if (parseResult.success && parseResult.data.ok) {
            const data = parseResult.data;
            console.log(
              `[ChatApp] Loaded ${String(data.chats.length)} chats from filesystem`,
            );

            // Convert filesystem chats to IChat format
            const chats = data.chats.map((chat) => ({
              id: chat.metadata.chatId,
              title: chat.metadata.title,
              description: chat.metadata.description ?? '',
              messages: chat.metadata.messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
              })),
              branch: chat.metadata.branch,
              worktreePath: chat.worktreePath,
              prNumber: chat.metadata.prNumber,
              prTitle: chat.metadata.prTitle,
              prUrl: chat.metadata.prUrl,
              prStatus: chat.metadata.prStatus ?? null,
              createdAt: new Date(chat.metadata.createdAt),
              updatedAt: new Date(chat.metadata.updatedAt),
            }));

            // Merge filesystem chats with any local chats (to preserve newly created ones)
            setRepositories((prev) =>
              prev.map((repo) => {
                if (repo.id !== repoId) {
                  return repo;
                }

                // Keep local chats that don't have worktrees yet (newly created)
                const localChatsWithoutWorktrees = repo.chats.filter(
                  (localChat) =>
                    localChat.worktreePath === undefined ||
                    localChat.worktreePath === '',
                );

                console.log(
                  `[ChatApp] Merging ${String(chats.length)} filesystem chats with ${String(localChatsWithoutWorktrees.length)} local chats`,
                );

                // Combine filesystem chats with local-only chats
                return {
                  ...repo,
                  chats: [...chats, ...localChatsWithoutWorktrees],
                };
              }),
            );

            // Mark this repo as loaded
            loadedReposRef.current.add(repoId);
          }
        }
      } catch (error) {
        console.error('Failed to load chats from worktrees:', error);
      }
    },
    [getAccessTokenSilently, setRepositories],
  );

  // Load chats from worktrees when repository changes (only once per repo)
  useEffect(() => {
    if (activeRepoId === null || activeRepoId === '' || !isAuthenticated) {
      return;
    }

    // Skip if already loaded
    if (loadedReposRef.current.has(activeRepoId)) {
      console.log(
        `[ChatApp] Skipping load for ${activeRepoId} - already loaded`,
      );
      return;
    }

    const activeRepo = repositories.find((r) => r.id === activeRepoId);
    if (activeRepo?.localPath === undefined || activeRepo.localPath === '') {
      console.log(`[ChatApp] Skipping load for ${activeRepoId} - no localPath`);
      return;
    }

    void loadChatsFromFilesystem(activeRepoId, activeRepo.localPath);
  }, [activeRepoId, isAuthenticated, repositories, loadChatsFromFilesystem]);

  // ===== Scaffolder state (from AI.tsx) =====
  const formData = useFormStore();
  const {
    userMetadata,
    isLoading: isUserLoading,
    serverConfigStatus,
  } = useUser();
  const { decryptedMetadata } = useDecryptedUserMetadata();
  const { publicRepoURL, setPublicRepoURL } = formData;
  const { setTransformations, schemaInfo, setSchemaInfo } =
    useTransformationsStore();
  const { typeMappings, dbTypes, setUserFiles } = useMockDatabaseStore();
  const { selectedProject, invalidateProjectCache } = useProjectStore();

  // Invalidate project cache when user metadata changes
  useEffect(() => {
    if (
      selectedProject !== null &&
      (userMetadata !== null || decryptedMetadata !== null)
    ) {
      invalidateProjectCache(selectedProject.name);
    }
  }, [
    userMetadata,
    decryptedMetadata,
    selectedProject,
    invalidateProjectCache,
  ]);

  const [inputRepoURL] = useState<string>(publicRepoURL);

  // Toggle for scaffolder file source (only visible in dev environment)
  // When true: use local files from /files directory
  // When false: use remote GitHub repo
  // NOTE: useLocalScaffolderFiles and remoteScaffolderURL now come from useUIStore (persisted)

  // Scaffolder mode file loading:
  // - If toggle is ON (useLocalScaffolderFiles): Uses local files from /files directory
  // - If toggle is OFF: Uses remote GitHub repo URL
  const effectiveRepoURL = isScaffolderMode
    ? useLocalScaffolderFiles
      ? '' // Empty string triggers local file loading in useUserFiles
      : remoteScaffolderURL
    : publicRepoURL;

  // Load scaffolder template files
  // In dev mode: isUsingLocalFiles causes useUserFiles to read from local /files directory
  // In production: reads from the remote GitHub repo (judigot/scaffolder-files)
  const {
    refetch: refetchUserFiles,
    data: queryUserFiles,
    error: userFilesError,
    isError: isUserFilesError,
    isFetching: isUserFilesFetching,
  } = useUserFiles(
    { publicRepoURL: effectiveRepoURL },
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      // Scaffolder mode: always fetch files (local in dev, remote in prod)
      // Repo mode: only fetch when on fileViewer tab with valid URL
      enabled:
        isScaffolderMode || (activeTab === 'fileViewer' && !!effectiveRepoURL),
    },
  );

  // Only update global userFiles store in scaffolder mode
  // This store is for scaffolder template files (Projects, Constants, etc.)
  // Repository files should NOT go into this store
  useEffect(() => {
    if (
      isScaffolderMode &&
      queryUserFiles?.userFiles &&
      queryUserFiles.userFiles.length > 0
    ) {
      setUserFiles(queryUserFiles.userFiles);
    }
  }, [isScaffolderMode, queryUserFiles, setUserFiles]);

  const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);

  useEffect(() => {
    setPublicRepoURL(inputRepoURL);
    if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
      void refetchUserFiles();
    }
  }, [
    debouncedRepoURL,
    inputRepoURL,
    publicRepoURL,
    setPublicRepoURL,
    refetchUserFiles,
  ]);

  useEffect(() => {
    if (!typeMappings || Object.keys(typeMappings).length === 0) {
      return;
    }
    if (!dbTypes || dbTypes.length === 0) {
      return;
    }
    setTransformations();
  }, [typeMappings, dbTypes, setTransformations]);

  useEffect(() => {
    if (publicRepoURL) {
      void refetchUserFiles();
    }
  }, [publicRepoURL, refetchUserFiles]);

  // Keyboard shortcut to toggle between tabs (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const currentTab = useUIStore.getState().activeTab;
        const nextTab =
          currentTab === 'fileViewer'
            ? 'chat'
            : currentTab === 'chat'
              ? 'infra'
              : 'fileViewer';
        setActiveTab(nextTab);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setActiveTab]);

  // ===== Multi-repo chat derived state =====
  const activeRepo = repositories.find((r) => r.id === activeRepoId);
  const activeSprint =
    activeRepo?.sprints.find((s) => s.id === activeSprintId) ?? null;
  const activeChat =
    activeChatScope === 'regular'
      ? (activeRepo?.chats.find((c) => c.id === activeChatId) ?? null)
      : (activeSprint?.chats.find((c) => c.id === activeChatId) ?? null);

  // Determine which path to use for file fetching:
  // - If active chat has worktree, use worktreePath
  // - Otherwise, use repo localPath
  const useWorktree =
    activeChat?.worktreePath !== undefined && activeChat.worktreePath !== '';

  // Fetch files from local repo clone or worktree
  // Note: data is unused - we only need refetch to trigger file refresh after agent operations
  const { refetch: refetchLocalFiles, data: _localFiles } = useLocalRepoFiles(
    { localPath: useWorktree ? undefined : activeRepo?.localPath },
    {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled:
        !useWorktree &&
        activeRepo?.localPath !== undefined &&
        activeRepo.localPath !== '',
    },
  );

  // Fetch files from worktree
  // When useWorktree is true, activeChat is guaranteed non-null (since useWorktree is derived from activeChat?.worktreePath)
  const worktreePathForFetch = useWorktree
    ? activeChat.worktreePath
    : undefined;
  const {
    refetch: refetchWorktreeFiles,
    data: worktreeFiles,
    isLoading: isWorktreeFilesLoading,
  } = useWorktreeFiles(
    { worktreePath: worktreePathForFetch },
    {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled:
        worktreePathForFetch !== undefined && worktreePathForFetch !== '',
    },
  );

  // Combine refetch functions
  const refetchFiles = useCallback(async () => {
    if (useWorktree) {
      await refetchWorktreeFiles();
    } else {
      await refetchLocalFiles();
    }
  }, [useWorktree, refetchWorktreeFiles, refetchLocalFiles]);

  /**
   * Checkout a chat's branch and refetch files.
   * Unified function used by both ChatTree selection and RepoTabs dropdown.
   */
  const checkoutChatBranch = useCallback(
    async (
      repo: IRepository,
      chatId: string,
      scope: 'sprint' | 'regular',
      sprintId?: string,
    ): Promise<boolean> => {
      if (repo.localPath === undefined || repo.localPath === '') {
        return false;
      }

      const { chat } = findChatInRepo(repo, chatId, scope, sprintId);
      if (chat === undefined) {
        return false;
      }

      const options = prepareCheckoutOptions(repo, chat);
      if (options === null) {
        return false;
      }

      const result = await checkout(options);
      if (result?.ok === true) {
        await refetchFiles();
        // Invalidate the Code tab's file cache to trigger refetch with new branch
        await queryClient.invalidateQueries({
          queryKey: ['remoteRepoFiles', repo.repoUrl],
        });
        return true;
      }
      return false;
    },
    [checkout, refetchFiles, queryClient],
  );

  // Note: localFiles/worktreeFiles are for viewing in repositories mode only
  // They are NOT stored in global useMockDatabaseStore (that's for scaffolder templates)

  // ===== Multi-repo chat handlers =====
  const handleAddRepo = async (repoUrl: string) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to add repositories.');
    }

    const token = await getAccessTokenSilently();
    const response = await fetch('/api/local-repo/clone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw new Error(
        getErrorFromResponse(errorData, 'Failed to clone repository'),
      );
    }

    const cloneJson: unknown = await response.json();
    const cloneResult = CloneResponseSchema.safeParse(cloneJson);
    if (!cloneResult.success) {
      throw new Error('Invalid response from clone API');
    }
    const cloneData = cloneResult.data;

    if (
      !cloneData.ok ||
      cloneData.repoPath === undefined ||
      cloneData.repoPath === ''
    ) {
      throw new Error('Clone failed. Please try again.');
    }

    // Persist to Auth0 user_metadata
    const success = await persistRepository({
      repoUrl,
      localPath: cloneData.repoPath,
      defaultBranch: cloneData.defaultBranch,
      authType: cloneData.authType,
    });
    if (!success) {
      throw new Error('Failed to persist repository metadata');
    }

    // Create the new repo object for local state
    const newRepo = storedRepoToFullRepo({
      repoUrl,
      addedAt: new Date().toISOString(),
      localPath: cloneData.repoPath,
      defaultBranch: cloneData.defaultBranch,
      authType: cloneData.authType,
    });

    // Add to store
    addRepoToStore(newRepo);

    setActiveRepoId(newRepo.id);
    setActiveSprintId(null);
    setActiveChatScope('regular');
    setActiveChatId(null);
  };

  const handleSelectRepo = (repoId: string) => {
    setActiveRepoId(repoId);
    const repo = repositories.find((r) => r.id === repoId);
    setActiveSprintId(repo?.sprints[0]?.id ?? null);
    setActiveChatScope('regular');
    setActiveChatId(null);
  };

  const handleRemoveRepo = async (repoUrl: string, repoId: string) => {
    const success = await persistRemoveRepository(repoUrl);
    if (!success) {
      throw new Error('Failed to remove repository from profile');
    }

    // Remove from store (also handles clearing active selection if needed)
    removeRepoFromStore(repoId);
  };

  const handleDeleteClone = async (repoPath: string) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to delete local clones.');
    }

    const token = await getAccessTokenSilently();
    const response = await fetch('/api/local-repo/delete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoPath, confirm: true }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw new Error(
        getErrorFromResponse(errorData, 'Failed to delete local clone'),
      );
    }

    // Note: We don't remove the repo from the list, just the local clone
    // The user can still see the repo but it will show "No local clone available"
  };

  const handleSelectBranch = async (
    repoId: string,
    chatId: string,
    scope: 'sprint' | 'regular',
    sprintId?: string,
  ) => {
    setActiveRepoId(repoId);
    setActiveChatScope(scope);
    setActiveChatId(chatId);
    if (scope === 'sprint') {
      setActiveSprintId(sprintId ?? null);
    } else {
      const repo = repositories.find((r) => r.id === repoId);
      setActiveSprintId(repo?.sprints[0]?.id ?? null);
    }

    // Checkout the chat's branch
    const repo = repositories.find((r) => r.id === repoId);
    if (repo) {
      await checkoutChatBranch(repo, chatId, scope, sprintId);
    }
  };

  const handleSelectSprint = (sprintId: string) => {
    setActiveSprintId(sprintId);
    const sprint = activeRepo?.sprints.find((s) => s.id === sprintId) ?? null;
    setActiveChatScope('sprint');
    setActiveChatId(sprint?.chats[0]?.id ?? null);
  };

  const handleSelectChat = async (chatId: string) => {
    if (activeChatScope === 'sprint' && activeChatId === chatId) {
      setActiveChatId(null);
      setActiveChatScope('regular');
      return;
    }
    setActiveChatScope('sprint');
    setActiveChatId(chatId);

    // Find the sprint containing this chat and checkout branch
    if (activeRepo) {
      const sprint = activeRepo.sprints.find((s) =>
        s.chats.some((c) => c.id === chatId),
      );
      await checkoutChatBranch(activeRepo, chatId, 'sprint', sprint?.id);
    }
  };

  const handleSelectRegularChat = async (chatId: string) => {
    if (activeChatScope === 'regular' && activeChatId === chatId) {
      setActiveChatId(null);
      return;
    }
    setActiveChatScope('regular');
    setActiveChatId(chatId);

    // Checkout branch for regular chat
    if (activeRepo) {
      await checkoutChatBranch(activeRepo, chatId, 'regular');
    }
  };

  const handleNewChat = () => {
    if (!activeRepo) {
      return;
    }

    const newChat = {
      id: `chat-${String(Date.now())}`,
      title: 'New feature',
      description: 'Describe your task...',
      prStatus: activeChatScope === 'regular' ? null : ('draft' as const),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      // No worktree yet - will be created on first message
    };

    if (activeChatScope === 'regular' || activeSprintId === null) {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? { ...repo, chats: [newChat, ...repo.chats] }
            : repo,
        ),
      );
      setActiveChatScope('regular');
      setActiveChatId(newChat.id);
    } else {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        chats: [newChat, ...sprint.chats],
                        updatedAt: new Date(),
                      }
                    : sprint,
                ),
              }
            : repo,
        ),
      );
      setActiveChatId(newChat.id);
    }
  };

  const [isStreamingMessage, setIsStreamingMessage] = useState(false);

  // Helper to add a message to the current chat
  const addMessageToChat = useCallback(
    (chatId: string, message: IMessage) => {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        updatedAt: new Date(),
                        chats: sprint.chats.map((chat) =>
                          chat.id === chatId && activeChatScope === 'sprint'
                            ? {
                                ...chat,
                                messages: [...chat.messages, message],
                                updatedAt: new Date(),
                              }
                            : chat,
                        ),
                      }
                    : sprint,
                ),
                chats: repo.chats.map((chat) =>
                  chat.id === chatId && activeChatScope === 'regular'
                    ? {
                        ...chat,
                        messages: [...chat.messages, message],
                        updatedAt: new Date(),
                      }
                    : chat,
                ),
              }
            : repo,
        ),
      );
    },
    [activeRepoId, activeSprintId, activeChatScope, setRepositories],
  );

  // Helper to update the last assistant message (for streaming)
  const updateLastAssistantMessage = useCallback(
    (chatId: string, content: string) => {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        chats: sprint.chats.map((chat) => {
                          if (
                            chat.id !== chatId ||
                            activeChatScope !== 'sprint'
                          ) {
                            return chat;
                          }
                          const messages = [...chat.messages];
                          if (messages.length === 0) {
                            return { ...chat, messages };
                          }
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg.role === 'assistant') {
                            messages[messages.length - 1] = {
                              ...lastMsg,
                              content,
                            };
                          }
                          return { ...chat, messages };
                        }),
                      }
                    : sprint,
                ),
                chats: repo.chats.map((chat) => {
                  if (chat.id !== chatId || activeChatScope !== 'regular') {
                    return chat;
                  }
                  const messages = [...chat.messages];
                  if (messages.length === 0) {
                    return { ...chat, messages };
                  }
                  const lastMsg = messages[messages.length - 1];
                  if (lastMsg.role === 'assistant') {
                    messages[messages.length - 1] = { ...lastMsg, content };
                  }
                  return { ...chat, messages };
                }),
              }
            : repo,
        ),
      );
    },
    [activeRepoId, activeSprintId, activeChatScope, setRepositories],
  );

  const updateChatSessionId = useCallback(
    (chatId: string, sessionId: string) => {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        chats: sprint.chats.map((chat) =>
                          chat.id === chatId && activeChatScope === 'sprint'
                            ? { ...chat, opencodeSessionId: sessionId }
                            : chat,
                        ),
                      }
                    : sprint,
                ),
                chats: repo.chats.map((chat) =>
                  chat.id === chatId && activeChatScope === 'regular'
                    ? { ...chat, opencodeSessionId: sessionId }
                    : chat,
                ),
              }
            : repo,
        ),
      );
    },
    [activeRepoId, activeSprintId, activeChatScope, setRepositories],
  );

  // Extract branch name from agent response and update chat
  const updateChatBranch = useCallback(
    (chatId: string, branch: string) => {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        chats: sprint.chats.map((chat) =>
                          chat.id === chatId && activeChatScope === 'sprint'
                            ? { ...chat, branch }
                            : chat,
                        ),
                      }
                    : sprint,
                ),
                chats: repo.chats.map((chat) =>
                  chat.id === chatId && activeChatScope === 'regular'
                    ? { ...chat, branch }
                    : chat,
                ),
              }
            : repo,
        ),
      );
    },
    [activeRepoId, activeSprintId, activeChatScope, setRepositories],
  );

  // Update chat worktree fields
  const updateChatWorktree = useCallback(
    (
      chatId: string,
      updates: {
        worktreePath?: string;
        worktreeStatus?: 'creating' | 'ready' | 'error';
        branch?: string;
      },
    ) => {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId
            ? {
                ...repo,
                sprints: repo.sprints.map((sprint) =>
                  sprint.id === activeSprintId
                    ? {
                        ...sprint,
                        chats: sprint.chats.map((chat) =>
                          chat.id === chatId && activeChatScope === 'sprint'
                            ? { ...chat, ...updates }
                            : chat,
                        ),
                      }
                    : sprint,
                ),
                chats: repo.chats.map((chat) =>
                  chat.id === chatId && activeChatScope === 'regular'
                    ? { ...chat, ...updates }
                    : chat,
                ),
              }
            : repo,
        ),
      );
    },
    [activeRepoId, activeSprintId, activeChatScope, setRepositories],
  );

  // Convert ModelId to OpenCode format (provider/model)
  const modelIdToOpenCodeFormat = (modelId: ModelId): string => {
    const modelOption = MODEL_OPTIONS.find((m) => m.id === modelId);
    if (modelOption === undefined) {
      return `openai/${modelId}`; // Default to openai
    }
    return `${modelOption.provider}/${modelId}`;
  };

  // Parse agent response for branch name patterns
  const extractBranchFromResponse = (text: string): string | null => {
    // Match patterns like:
    // - "git checkout -b feat/add-file1"
    // - "Branch: feat/add-file1"
    // - "✓ Branch: feat/add-file1"
    const patterns = [
      /git checkout -b ([\w\-/]+)/i,
      /Branch:\s*([\w\-/]+)/i,
      /created branch [`'"]?([\w\-/]+)[`'"]?/i,
      /switched to.*branch [`'"]?([\w\-/]+)[`'"]?/i,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (
        match?.[1] !== undefined &&
        match[1] !== '' &&
        match[1] !== 'main' &&
        match[1] !== 'master'
      ) {
        return match[1];
      }
    }
    return null;
  };

  const handleSendMessage = async (
    chatId: string,
    content: string,
    model: ModelId,
  ) => {
    // Add user message immediately
    const userMessage: IMessage = {
      id: `msg-${String(Date.now())}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    addMessageToChat(chatId, userMessage);

    if (activeRepo === undefined) {
      const errorMessage: IMessage = {
        id: `msg-${String(Date.now() + 1)}`,
        role: 'assistant',
        content: 'Error: No active repository selected.',
        timestamp: new Date(),
      };
      addMessageToChat(chatId, errorMessage);
      return;
    }

    const repoPath = activeRepo.localPath;
    if (repoPath === undefined || repoPath === '') {
      const errorMessage: IMessage = {
        id: `msg-${String(Date.now() + 1)}`,
        role: 'assistant',
        content:
          'Error: No local repository path configured for this repository.',
        timestamp: new Date(),
      };
      addMessageToChat(chatId, errorMessage);
      return;
    }

    // Get all messages for context (convert to API format)
    const currentChat =
      activeChatScope === 'sprint'
        ? activeRepo.sprints
            .find((s) => s.id === activeSprintId)
            ?.chats.find((c) => c.id === chatId)
        : activeRepo.chats.find((c) => c.id === chatId);

    const sessionId = currentChat?.opencodeSessionId;
    let worktreePath = currentChat?.worktreePath;

    // Create worktree on first message if it doesn't exist
    if (
      (worktreePath === undefined || worktreePath === '') &&
      isAuthenticated &&
      activeRepo.localPath !== undefined &&
      activeRepo.localPath !== ''
    ) {
      try {
        updateChatWorktree(chatId, { worktreeStatus: 'creating' });

        const token = await getAccessTokenSilently();
        const createResponse = await fetch('/api/worktree/create', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repoPath: activeRepo.localPath,
            chatId,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create worktree');
        }

        const createJson: unknown = await createResponse.json();
        const createResult = WorktreeCreateResponseSchema.safeParse(createJson);
        if (!createResult.success) {
          throw new Error('Invalid response from worktree create API');
        }
        const createData = createResult.data;

        if (createData.ok) {
          worktreePath = createData.worktreePath;
          updateChatWorktree(chatId, {
            worktreePath: createData.worktreePath,
            worktreeStatus: 'ready',
          });
        } else {
          updateChatWorktree(chatId, { worktreeStatus: 'error' });
          const errorMessage: IMessage = {
            id: `msg-${String(Date.now() + 1)}`,
            role: 'assistant',
            content: 'Error: Failed to create worktree for this chat.',
            timestamp: new Date(),
          };
          addMessageToChat(chatId, errorMessage);
          return;
        }
      } catch (error) {
        console.error('Failed to create worktree:', error);
        updateChatWorktree(chatId, { worktreeStatus: 'error' });
        const errorMessage: IMessage = {
          id: `msg-${String(Date.now() + 1)}`,
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to create worktree'}`,
          timestamp: new Date(),
        };
        addMessageToChat(chatId, errorMessage);
        return;
      }
    }

    // Determine working directory: use worktree if available, fallback to repo
    const workingDirectory =
      worktreePath !== undefined && worktreePath !== ''
        ? worktreePath
        : repoPath;

    // Pre-flight validation for worktree
    let commitCountBefore = 0;
    if (worktreePath !== undefined && worktreePath !== '' && isAuthenticated) {
      try {
        const token = await getAccessTokenSilently();
        const validationResponse = await fetch('/api/worktree/validate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ worktreePath }),
        });

        if (validationResponse.ok) {
          const validationJson: unknown = await validationResponse.json();
          const validationResult =
            WorktreeValidationResponseSchema.safeParse(validationJson);
          if (!validationResult.success) {
            console.error('Invalid validation response');
            return;
          }
          const validationData = validationResult.data;
          if (!validationData.valid) {
            const errorMessage: IMessage = {
              id: `msg-${String(Date.now() + 1)}`,
              role: 'assistant',
              content: `Worktree validation failed: ${validationData.error !== undefined && validationData.error !== '' ? validationData.error : 'Unknown error'}`,
              timestamp: new Date(),
            };
            addMessageToChat(chatId, errorMessage);
            return;
          }
          commitCountBefore = validationData.commitCount;
        }
      } catch (error) {
        console.error('Pre-flight validation error:', error);
      }
    }

    // Create placeholder for assistant response
    const assistantMessage: IMessage = {
      id: `msg-${String(Date.now() + 1)}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    addMessageToChat(chatId, assistantMessage);

    setIsStreamingMessage(true);

    try {
      const response = await fetch('/api/opencode/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          directory: workingDirectory,
          model: modelIdToOpenCodeFormat(model),
          // Use worktree prompt if in worktree, otherwise use repo prompt
          systemPrompt:
            worktreePath !== undefined && worktreePath !== ''
              ? WORKTREE_AGENT_PROMPT
              : REPO_AGENT_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        updateLastAssistantMessage(chatId, `Error: ${errorText}`);
        return;
      }

      const sessionJson: unknown = await response.json();
      const sessionResult = AgentSessionResponseSchema.safeParse(sessionJson);
      if (!sessionResult.success) {
        updateLastAssistantMessage(
          chatId,
          'Error: Invalid response from agent',
        );
        return;
      }
      const data = sessionResult.data;

      if (data.sessionId !== undefined && data.sessionId !== '') {
        updateChatSessionId(chatId, data.sessionId);
      }

      const trimmedAssistantText = data.assistantText?.trim();
      const assistantText =
        trimmedAssistantText !== undefined && trimmedAssistantText !== ''
          ? trimmedAssistantText
          : '(No response generated)';

      // Parse schema from response and update global store
      const schemaResult = validateSchemaInfoFromResponse(assistantText);
      if (
        schemaResult.success &&
        schemaResult.extracted &&
        schemaResult.data !== undefined
      ) {
        console.warn(
          '[ChatApp] Schema detected and parsed:',
          schemaResult.data,
        );
        setSchemaInfo(schemaResult.data);
        // Remove hidden schema tags from display text
        const cleanText = removeHiddenSchemaFromText(assistantText);
        updateLastAssistantMessage(chatId, cleanText);
      } else {
        updateLastAssistantMessage(chatId, assistantText);
      }

      // Extract branch name from agent response and associate with chat
      const extractedBranch = extractBranchFromResponse(assistantText);
      if (extractedBranch !== null) {
        updateChatBranch(chatId, extractedBranch);
      }

      // Post-flight validation for worktree
      if (
        worktreePath !== undefined &&
        worktreePath !== '' &&
        isAuthenticated
      ) {
        try {
          const token = await getAccessTokenSilently();
          const postValidationResponse = await fetch(
            '/api/worktree/validate-result',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                worktreePath,
                commitCountBefore,
              }),
            },
          );

          if (postValidationResponse.ok) {
            const postJson: unknown = await postValidationResponse.json();
            const postResult = PostValidationResponseSchema.safeParse(postJson);
            if (!postResult.success) {
              console.error('Invalid post-validation response');
              return;
            }
            const postData = postResult.data;

            if (postData.newCommits > 0) {
              console.warn(
                `Agent made ${String(postData.newCommits)} commit(s): ${postData.lastCommitMessage ?? ''}`,
              );

              // Update worktree path if it was renamed
              if (
                postData.worktreeRenamed === true &&
                postData.newWorktreePath !== undefined &&
                postData.newWorktreePath !== ''
              ) {
                updateChatWorktree(chatId, {
                  worktreePath: postData.newWorktreePath,
                });
              }

              // Update branch immediately when renamed (before PR creation)
              if (
                postData.branchRenamed === true &&
                postData.branch !== undefined &&
                postData.branch !== ''
              ) {
                updateChatWorktree(chatId, {
                  branch: postData.branch,
                });

                // Use branch name directly as chat title (remove hash suffix)
                const chatTitle = postData.branch.replace(
                  /-[a-zA-Z0-9]{5}$/,
                  '',
                );

                // Update chat title
                setRepositories((prev) =>
                  prev.map((repo) =>
                    repo.id === activeRepoId
                      ? {
                          ...repo,
                          sprints: repo.sprints.map((sprint) =>
                            sprint.id === activeSprintId
                              ? {
                                  ...sprint,
                                  chats: sprint.chats.map((chat) =>
                                    chat.id === chatId &&
                                    activeChatScope === 'sprint'
                                      ? {
                                          ...chat,
                                          title: chatTitle,
                                        }
                                      : chat,
                                  ),
                                }
                              : sprint,
                          ),
                          chats: repo.chats.map((chat) =>
                            chat.id === chatId && activeChatScope === 'regular'
                              ? {
                                  ...chat,
                                  title: chatTitle,
                                }
                              : chat,
                          ),
                        }
                      : repo,
                  ),
                );
              }

              // If this is the first commit and branch was renamed, create PR
              if (
                postData.branchRenamed === true &&
                postData.branch !== undefined &&
                postData.branch !== '' &&
                commitCountBefore <= 1
              ) {
                const currentWorktreePath =
                  postData.newWorktreePath !== undefined &&
                  postData.newWorktreePath !== ''
                    ? postData.newWorktreePath
                    : worktreePath;
                try {
                  const prResponse = await fetch('/api/pull-request/create', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      worktreePath: currentWorktreePath,
                      branch: postData.branch,
                    }),
                  });

                  if (prResponse.ok) {
                    const prJson: unknown = await prResponse.json();
                    const prResult =
                      PullRequestResponseSchema.safeParse(prJson);
                    if (!prResult.success) {
                      console.error('Invalid PR response');
                      return;
                    }
                    const prData = prResult.data;

                    if (prData.ok) {
                      // Update chat with PR info (branch already updated above)
                      setRepositories((prev) =>
                        prev.map((repo) =>
                          repo.id === activeRepoId
                            ? {
                                ...repo,
                                sprints: repo.sprints.map((sprint) =>
                                  sprint.id === activeSprintId
                                    ? {
                                        ...sprint,
                                        chats: sprint.chats.map((chat) =>
                                          chat.id === chatId &&
                                          activeChatScope === 'sprint'
                                            ? {
                                                ...chat,
                                                prNumber: prData.number,
                                                prTitle: prData.title,
                                                prUrl: prData.url,
                                                prStatus: 'draft',
                                              }
                                            : chat,
                                        ),
                                      }
                                    : sprint,
                                ),
                                chats: repo.chats.map((chat) =>
                                  chat.id === chatId &&
                                  activeChatScope === 'regular'
                                    ? {
                                        ...chat,
                                        prNumber: prData.number,
                                        prTitle: prData.title,
                                        prUrl: prData.url,
                                        prStatus: 'draft',
                                      }
                                    : chat,
                                ),
                              }
                            : repo,
                        ),
                      );

                      console.warn(
                        `Created PR #${String(prData.number)}: ${prData.title}`,
                      );
                    }
                  }
                } catch (prError) {
                  console.error('Failed to create PR:', prError);
                  // Don't fail the whole operation if PR creation fails
                }
              }
            }
          }
        } catch (error) {
          console.error('Post-flight validation error:', error);
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      updateLastAssistantMessage(chatId, `Error: ${errorMessage}`);
    } finally {
      setIsStreamingMessage(false);
    }
  };

  // isStreamingMessage can be used to disable input while streaming
  void isStreamingMessage; // Mark as intentionally available for future use

  const handlePromoteChat = (chatId: string) => {
    setRepositories((prev) =>
      prev.map((repo) =>
        repo.id === activeRepoId
          ? {
              ...repo,
              chats: repo.chats.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      prStatus: 'draft' as const,
                      updatedAt: new Date(),
                    }
                  : chat,
              ),
            }
          : repo,
      ),
    );
  };

  const handleMarkReady = (chatId: string) => {
    setRepositories((prev) =>
      prev.map((repo) =>
        repo.id === activeRepoId
          ? {
              ...repo,
              sprints: repo.sprints.map((sprint) =>
                sprint.id === activeSprintId
                  ? {
                      ...sprint,
                      updatedAt: new Date(),
                      chats: sprint.chats.map((chat) =>
                        chat.id === chatId
                          ? {
                              ...chat,
                              prStatus: 'ready' as const,
                              updatedAt: new Date(),
                            }
                          : chat,
                      ),
                    }
                  : sprint,
              ),
              chats: repo.chats.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      prStatus: 'ready' as const,
                      updatedAt: new Date(),
                    }
                  : chat,
              ),
            }
          : repo,
      ),
    );
  };

  // Filter to only show chats with messages or branches (hide empty placeholders)
  const filteredRegularChats = filterChatsWithContent(activeRepo?.chats ?? []);
  const filteredSprints = filterSprintsWithContent(activeRepo?.sprints ?? []);

  // Multi-chat content panel (ChatTree + ChatPanel side by side)
  const multiChatContent = (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <ChatTree
        sprints={filteredSprints}
        regularChats={filteredRegularChats}
        activeSprintId={activeSprintId}
        activeChatId={activeChatId}
        activeChatScope={activeChatScope}
        onSelectSprint={handleSelectSprint}
        onSelectChat={(chatId) => void handleSelectChat(chatId)}
        onSelectRegularChat={(chatId) => void handleSelectRegularChat(chatId)}
        onNewChat={handleNewChat}
      />
      <ChatPanel
        chat={activeChat}
        repositoryName={activeRepo?.name ?? ''}
        sprintName={
          activeChatScope === 'regular'
            ? 'main'
            : (activeSprint?.name ?? 'main')
        }
        onSendMessage={(chatId, content, model) =>
          void handleSendMessage(chatId, content, model)
        }
        onPromoteChat={handlePromoteChat}
        onMarkReady={handleMarkReady}
      />
    </div>
  );

  // Master View - renders the legacy App component
  if (isMasterMode) {
    return (
      <div className="flex flex-col h-screen w-full bg-bg overflow-hidden text-fg">
        {/* Top navigation with Master View/Scaffolder/Repositories tabs + UserProfile */}
        <TopNav
          isUserLoading={isUserLoading}
          serverConfigStatus={serverConfigStatus}
        />

        {/* Master View content - legacy App */}
        <div className="flex-1 overflow-auto">
          <App />
        </div>
      </div>
    );
  }

  if (isOpencodeWebMode) {
    return (
      <div className="flex flex-col h-screen w-full bg-bg overflow-hidden text-fg">
        <TopNav
          isUserLoading={isUserLoading}
          serverConfigStatus={serverConfigStatus}
        />
        <div className="flex-1 overflow-hidden">
          <OpenCodeWebView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-bg overflow-hidden text-fg">
      {/* Top navigation with Scaffolder/Repositories tabs + UserProfile */}
      <TopNav
        isUserLoading={isUserLoading}
        serverConfigStatus={serverConfigStatus}
      />

      {/* Repo tabs - shown in Repositories mode */}
      {!isScaffolderMode && (
        <RepoTabs
          repositories={repositories}
          activeRepoId={activeRepoId}
          activeChatId={activeChatId}
          activeChatScope={activeChatScope}
          activeSprintId={activeSprintId}
          onSelectRepo={handleSelectRepo}
          onSelectBranch={(repoId, chatId, scope, sprintId) =>
            void handleSelectBranch(repoId, chatId, scope, sprintId)
          }
          onAddRepo={(repoUrl) => void handleAddRepo(repoUrl)}
          onRemoveRepo={(repoUrl, repoId) =>
            void handleRemoveRepo(repoUrl, repoId)
          }
          onDeleteClone={(repoPath) => void handleDeleteClone(repoPath)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-hidden min-h-0">
          <AIChatContainer
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isScaffolderRepo={isScaffolderMode}
            repoUrl={isScaffolderMode ? undefined : activeRepo?.repoUrl}
            repoName={isScaffolderMode ? undefined : activeRepo?.name}
            useLocalScaffolderFiles={useLocalScaffolderFiles}
            onToggleLocalScaffolderFiles={setUseLocalScaffolderFiles}
            remoteScaffolderURL={remoteScaffolderURL}
            onRemoteScaffolderURLChange={setRemoteScaffolderURL}
            worktreeFiles={isScaffolderMode ? undefined : worktreeFiles}
            isWorktreeFilesLoading={
              isScaffolderMode ? false : isWorktreeFilesLoading
            }
            scaffolderFilesError={isUserFilesError ? userFilesError : null}
            isScaffolderFilesFetching={isUserFilesFetching}
          >
            {multiChatContent}
          </AIChatContainer>
        </div>
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasGeneratedCode={schemaInfo.length > 0}
          middleTab={isScaffolderMode ? BUILDER_TAB_CONFIG : CHAT_TAB_CONFIG}
        />
      </div>
    </div>
  );
}
