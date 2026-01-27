import { useEffect, useMemo, useState } from 'react';
import type { IMessage, IRepository } from '@/components/AI/chat-app/types.ts';
import { mockRepositories } from '@/components/AI/chat-app/mockData.ts';
import TopNav, { type TopLevelTab } from '@/components/AI/chat-app/TopNav.tsx';
import RepoTabs from '@/components/AI/chat-app/RepoTabs.tsx';
import ChatTree from '@/components/AI/chat-app/ChatTree.tsx';
import ChatPanel from '@/components/AI/chat-app/ChatPanel.tsx';
import { AIChatContainer } from '@/components/AI/AIChatContainer.tsx';
import TabBar from '@/components/AI/TabBar.tsx';
import useDebouncedValue from '@/hooks/useDebouncedValue.ts';
import { useDecryptedUserMetadata } from '@/hooks/useDecryptedUserMetadata.ts';
import { useRepositories, type IStoredRepository } from '@/hooks/useRepositories.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useUserFiles } from '@/hooks/useUserFiles.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';
import { useUIStore } from '@/useUIStore.ts';

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
    path: `~/projects/${repoName}`,
    repoUrl: stored.repoUrl,
    sprints: [],
    chats: [],
  };
}

export default function ChatApp() {
  // ===== Top-level tab state =====
  const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('scaffolder');

  // ===== Multi-repo chat state =====
  // Get persisted repos from Auth0
  const {
    repositories: storedRepos,
    addRepository: persistRepository,
  } = useRepositories();

  // Convert stored repos to full IRepository objects with local state for sprints/chats
  // Always include mock data as demo reference, plus user's saved repos
  const persistedRepositories = useMemo(() => {
    const userRepos = storedRepos.map(storedRepoToFullRepo);
    // Mock data always first as demo reference
    return [...mockRepositories, ...userRepos];
  }, [storedRepos]);

  // Local state extends persisted repos with sprints/chats (not persisted to Auth0)
  const [localRepoState, setLocalRepoState] = useState<Map<string, { sprints: IRepository['sprints']; chats: IRepository['chats'] }>>(new Map());

  // Merge persisted repos with local state
  const repositories = useMemo(() => {
    return persistedRepositories.map((repo) => {
      const localState = localRepoState.get(repo.id);
      if (localState) {
        return { ...repo, sprints: localState.sprints, chats: localState.chats };
      }
      return repo;
    });
  }, [persistedRepositories, localRepoState]);

  // Wrapper to update local repo state
  const setRepositories = (updater: IRepository[] | ((prev: IRepository[]) => IRepository[])) => {
    const newRepos = typeof updater === 'function' ? updater(repositories) : updater;
    const newLocalState = new Map<string, { sprints: IRepository['sprints']; chats: IRepository['chats'] }>();
    for (const repo of newRepos) {
      newLocalState.set(repo.id, { sprints: repo.sprints, chats: repo.chats });
    }
    setLocalRepoState(newLocalState);
  };

  // Initialize with mock data (demo repo is always first)
  const [activeRepoId, setActiveRepoId] = useState<string>(mockRepositories[0]?.id ?? '');
  const [activeSprintId, setActiveSprintId] = useState<string | null>(mockRepositories[0]?.sprints[0]?.id ?? null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatScope, setActiveChatScope] = useState<'sprint' | 'regular'>('regular');

  // ===== Scaffolder state (from AI.tsx) =====
  const { activeTab, setActiveTab } = useUIStore();
  const formData = useFormStore();
  const {
    userMetadata,
    isLoading: isUserLoading,
    serverConfigStatus,
  } = useUser();
  const { decryptedMetadata } = useDecryptedUserMetadata();
  const { publicRepoURL, setPublicRepoURL } = formData;
  const { setTransformations, schemaInfo } = useTransformationsStore();
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
  }, [userMetadata, decryptedMetadata, selectedProject, invalidateProjectCache]);

  const [inputRepoURL] = useState<string>(publicRepoURL);

  const { refetch: refetchUserFiles, data: userFiles } = useUserFiles(
    { publicRepoURL },
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: !!publicRepoURL,
    }
  );

  useEffect(() => {
    if (userFiles && userFiles.length > 0) {
      setUserFiles(userFiles);
    }
  }, [userFiles, setUserFiles]);

  const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);

  useEffect(() => {
    setPublicRepoURL(inputRepoURL);
    if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
      void refetchUserFiles();
    }
  }, [debouncedRepoURL, inputRepoURL, publicRepoURL, setPublicRepoURL, refetchUserFiles]);

  useEffect(() => {
    if (!typeMappings || Object.keys(typeMappings).length === 0) {return;}
    if (!dbTypes || dbTypes.length === 0) {return;}
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
  const activeSprint = activeRepo?.sprints.find((s) => s.id === activeSprintId) ?? null;
  const activeChat =
    activeChatScope === 'regular'
      ? activeRepo?.chats.find((c) => c.id === activeChatId) ?? null
      : activeSprint?.chats.find((c) => c.id === activeChatId) ?? null;

  // ===== Multi-repo chat handlers =====
  const handleAddRepo = async (repoUrl: string) => {
    // Persist to Auth0 user_metadata
    const success = await persistRepository(repoUrl);
    if (!success) {
      // Could show error toast here
      console.error('Failed to persist repository to Auth0');
      return;
    }

    // Create the new repo object for local state
    const newRepo = storedRepoToFullRepo({ repoUrl, addedAt: new Date().toISOString() });

    // Update local state
    setLocalRepoState((prev) => {
      const newState = new Map(prev);
      newState.set(newRepo.id, { sprints: [], chats: [] });
      return newState;
    });

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

  const handleSelectBranch = (
    repoId: string,
    chatId: string,
    scope: 'sprint' | 'regular',
    sprintId?: string
  ) => {
    setActiveRepoId(repoId);
    setActiveChatScope(scope);
    setActiveChatId(chatId);
    if (scope === 'sprint') {
      setActiveSprintId(sprintId ?? null);
      return;
    }
    const repo = repositories.find((r) => r.id === repoId);
    setActiveSprintId(repo?.sprints[0]?.id ?? null);
  };

  const handleSelectSprint = (sprintId: string) => {
    setActiveSprintId(sprintId);
    const sprint = activeRepo?.sprints.find((s) => s.id === sprintId) ?? null;
    setActiveChatScope('sprint');
    setActiveChatId(sprint?.chats[0]?.id ?? null);
  };

  const handleSelectChat = (chatId: string) => {
    if (activeChatScope === 'sprint' && activeChatId === chatId) {
      setActiveChatId(null);
      setActiveChatScope('regular');
      return;
    }
    setActiveChatScope('sprint');
    setActiveChatId(chatId);
  };

  const handleSelectRegularChat = (chatId: string) => {
    if (activeChatScope === 'regular' && activeChatId === chatId) {
      setActiveChatId(null);
      return;
    }
    setActiveChatScope('regular');
    setActiveChatId(chatId);
  };

  const handleNewChat = () => {
    if (!activeRepo) {return;}

    const newChat = {
      id: `chat-${String(Date.now())}`,
      title: 'New feature',
      description: 'Describe your task...',
      prStatus: activeChatScope === 'regular' ? null : ('draft' as const),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (activeChatScope === 'regular' || activeSprintId === null) {
      setRepositories((prev) =>
        prev.map((repo) =>
          repo.id === activeRepoId ? { ...repo, chats: [newChat, ...repo.chats] } : repo
        )
      );
      setActiveChatScope('regular');
      setActiveChatId(newChat.id);
      return;
    }

    setRepositories((prev) =>
      prev.map((repo) =>
        repo.id === activeRepoId
          ? {
              ...repo,
              sprints: repo.sprints.map((sprint) =>
                sprint.id === activeSprintId
                  ? { ...sprint, chats: [newChat, ...sprint.chats], updatedAt: new Date() }
                  : sprint
              ),
            }
          : repo
      )
    );
    setActiveChatId(newChat.id);
  };

  const handleSendMessage = (chatId: string, content: string) => {
    const userMessage: IMessage = {
      id: `msg-${String(Date.now())}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

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
                          ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date() }
                          : chat
                      ),
                    }
                  : sprint
              ),
              chats: repo.chats.map((chat) =>
                chat.id === chatId && activeChatScope === 'regular'
                  ? { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date() }
                  : chat
              ),
            }
          : repo
      )
    );

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: IMessage = {
        id: `msg-${String(Date.now() + 1)}`,
        role: 'assistant',
        content: `I received: "${content}". The AI backend will process this and apply code changes. This is a static demo.`,
        timestamp: new Date(),
      };

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
                            ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date() }
                            : chat
                        ),
                      }
                    : sprint
                ),
                chats: repo.chats.map((chat) =>
                  chat.id === chatId && activeChatScope === 'regular'
                    ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date() }
                    : chat
                ),
              }
            : repo
        )
      );
    }, 600);
  };

  const handlePromoteChat = (chatId: string) => {
    setRepositories((prev) =>
      prev.map((repo) =>
        repo.id === activeRepoId
          ? {
              ...repo,
              chats: repo.chats.map((chat) =>
                chat.id === chatId ? { ...chat, prStatus: 'draft' as const, updatedAt: new Date() } : chat
              ),
            }
          : repo
      )
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
                        chat.id === chatId ? { ...chat, prStatus: 'ready' as const, updatedAt: new Date() } : chat
                      ),
                    }
                  : sprint
              ),
              chats: repo.chats.map((chat) =>
                chat.id === chatId ? { ...chat, prStatus: 'ready' as const, updatedAt: new Date() } : chat
              ),
            }
          : repo
      )
    );
  };

  // Multi-chat content panel (ChatTree + ChatPanel side by side)
  const multiChatContent = (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <ChatTree
        sprints={activeRepo?.sprints ?? []}
        regularChats={activeRepo?.chats ?? []}
        activeSprintId={activeSprintId}
        activeChatId={activeChatId}
        activeChatScope={activeChatScope}
        onSelectSprint={handleSelectSprint}
        onSelectChat={handleSelectChat}
        onSelectRegularChat={handleSelectRegularChat}
        onNewChat={handleNewChat}
      />
      <ChatPanel
        chat={activeChat}
        repositoryName={activeRepo?.name ?? ''}
        sprintName={activeChatScope === 'regular' ? 'main' : activeSprint?.name ?? 'main'}
        onSendMessage={handleSendMessage}
        onPromoteChat={handlePromoteChat}
        onMarkReady={handleMarkReady}
      />
    </div>
  );

  const isScaffolderMode = topLevelTab === 'scaffolder';

  return (
    <div className="flex flex-col h-screen w-full bg-bg overflow-hidden text-fg">
      {/* Top navigation with Scaffolder/Repositories tabs + UserProfile */}
      <TopNav
        activeTab={topLevelTab}
        onTabChange={setTopLevelTab}
        isUserLoading={isUserLoading}
        serverConfigStatus={serverConfigStatus}
      />

      {/* Repo tabs - only shown in Repositories mode */}
      {!isScaffolderMode && (
        <RepoTabs
          repositories={repositories}
          activeRepoId={activeRepoId}
          onSelectRepo={handleSelectRepo}
          onSelectBranch={handleSelectBranch}
          onAddRepo={handleAddRepo}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-hidden min-h-0">
          <AIChatContainer
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isScaffolderRepo={isScaffolderMode}
            repoUrl={activeRepo?.repoUrl}
            repoName={activeRepo?.name}
          >
            {multiChatContent}
          </AIChatContainer>
        </div>
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasGeneratedCode={schemaInfo.length > 0}
        />
      </div>
    </div>
  );
}
