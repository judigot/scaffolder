import type {
  IChat,
  IRepository,
  ISprint,
} from '@/components/AI/chat-app/types.ts';

export interface ICheckoutOptions {
  repoId: string;
  localPath?: string;
  branch: string;
}

export interface ICheckoutResult {
  ok: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  durationMs?: number;
  error?: string;
}

/**
 * Find a chat within a repository by ID
 */
export function findChatInRepo(
  repo: IRepository,
  chatId: string,
  scope: 'sprint' | 'regular',
  sprintId?: string,
): { chat: IChat | undefined; sprint: ISprint | undefined } {
  if (scope === 'sprint') {
    // Look in specific sprint or all sprints
    const sprint =
      sprintId !== undefined && sprintId !== ''
        ? repo.sprints.find((s) => s.id === sprintId)
        : repo.sprints.find((s) => s.chats.some((c) => c.id === chatId));
    const chat = sprint?.chats.find((c) => c.id === chatId);
    return { chat, sprint };
  }
  // Regular chat
  const chat = repo.chats.find((c) => c.id === chatId);
  return { chat, sprint: undefined };
}

/**
 * Prepare checkout options from a chat
 */
export function prepareCheckoutOptions(
  repo: IRepository,
  chat: IChat,
): ICheckoutOptions | null {
  if (
    chat.branch === undefined ||
    chat.branch === '' ||
    repo.localPath === undefined ||
    repo.localPath === ''
  ) {
    return null;
  }

  return {
    repoId: repo.id,
    localPath: repo.localPath,
    branch: chat.branch,
  };
}

/**
 * Check if a chat requires checkout (has branch but no worktree)
 */
export function chatRequiresCheckout(chat: IChat): boolean {
  // If chat has worktree, no checkout needed
  if (chat.worktreePath !== undefined && chat.worktreePath !== '') {
    return false;
  }
  // If chat has branch, checkout is needed
  return chat.branch !== undefined && chat.branch !== '';
}
