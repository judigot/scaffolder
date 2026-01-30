import type { IChat, ISprint } from '@/components/AI/chat-app/types.ts';

/**
 * Check if a chat has content (messages or a branch).
 * Used to filter out empty placeholder chats.
 */
export function chatHasContent(chat: IChat): boolean {
  return (
    chat.messages.length > 0 ||
    (chat.branch !== undefined && chat.branch !== '')
  );
}

/**
 * Filter chats to only include those with content.
 */
export function filterChatsWithContent(chats: IChat[]): IChat[] {
  return chats.filter(chatHasContent);
}

/**
 * Filter sprints to only include chats with content in each sprint.
 */
export function filterSprintsWithContent(sprints: ISprint[]): ISprint[] {
  return sprints.map((sprint) => ({
    ...sprint,
    chats: sprint.chats.filter(chatHasContent),
  }));
}
