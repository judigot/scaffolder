# Plan: Chat Abstraction Layer

## Status: ✅ IMPLEMENTED

## Goal

Create a wrapper around chat/AI SDKs so we can swap implementations without rewriting components.

## Decision: Which SDK First?

| Option            | Pros                                                 | Cons                                       |
| ----------------- | ---------------------------------------------------- | ------------------------------------------ |
| **Vercel AI SDK** | Most maintained, streaming built-in, large community | API changes between versions               |
| **@chatscope**    | Pure UI, no vendor lock-in                           | UI-only (need separate streaming solution) |
| **Roll our own**  | Full control                                         | More work, reinventing the wheel           |

**Decision:** Built adapter pattern that can wrap **any** SDK. Currently have:

- Vercel AI SDK adapter (for direct LLM calls)
- OpenCode adapter (for local AI via SSE)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Chat Components (OpenCodeChatPanel, ChatPanel, etc.)        │
└─────────────────────────┬────────────────────────────────────┘
                          │ uses
┌─────────────────────────▼────────────────────────────────────┐
│  useChatSession (our abstraction)                            │
│  - Stable API: messages, send, stop, isLoading, error, retry │
│  - Provider-agnostic                                         │
└─────────────────────────┬────────────────────────────────────┘
                          │ delegates to
┌─────────────────────────▼────────────────────────────────────┐
│  Adapters                                                    │
│  ├─ vercel-ai.ts (for OpenAI, Anthropic, etc.)               │
│  └─ opencode.ts (for local OpenCode server)                  │
└─────────────────────────┬────────────────────────────────────┘
                          │ calls
┌─────────────────────────▼────────────────────────────────────┐
│  Backend Endpoints                                           │
│  ├─ /api/chat (existing, Vercel AI SDK compatible)           │
│  └─ /api/opencode/chat/stream (new SSE endpoint)             │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Backend Proxy ✅

- [x] Create `/api/opencode/chat/stream` SSE endpoint
- [x] Proxy OpenCode events to client-friendly format
- [x] Handle session creation and directory context

### Phase 2: Abstraction Hook ✅

- [x] Create `src/lib/chat/types.ts` with interfaces
- [x] Create `src/lib/chat/useChatSession.ts` hook
- [x] Expose stable interface:
  ```ts
  interface ChatSession {
    messages: ChatMessage[];
    status: ChatStatus;
    error: ChatError | null;
    isLoading: boolean;
    sessionId: string | null;
    send: (content: string) => void;
    stop: () => void;
    retry: () => void;
    clear: () => void;
    setMessages: (messages: ChatMessage[]) => void;
  }
  ```

### Phase 3: Adapters ✅

- [x] Create `src/lib/chat/adapters/vercel-ai.ts`
- [x] Create `src/lib/chat/adapters/opencode.ts`
- [x] Both implement `ChatAdapter` interface

### Phase 4: Migrate Components ✅

- [x] Migrated `OpenCodeChatPanel` to use `useChatSession`
- [x] Added streaming indicator and stop button
- [x] Added error display with retry button
- [ ] Migrate other chat panels (optional, lower priority)

### Phase 5: Tests ✅

- [x] Added `src/tests/chat/useChatSession.test.ts`
- [x] 12 tests covering core functionality

## File Structure (Implemented)

```
src/
├── lib/
│   └── chat/
│       ├── index.ts              # Public exports
│       ├── types.ts              # ChatMessage, ChatSession, ChatAdapter interfaces
│       ├── useChatSession.ts     # Main hook
│       └── adapters/
│           ├── vercel-ai.ts      # Vercel AI SDK adapter
│           └── opencode.ts       # OpenCode SSE adapter
├── app/
│   └── routes/
│       └── opencode/
│           ├── chat.ts           # Existing non-streaming endpoint
│           ├── stream.ts         # NEW: SSE streaming endpoint
│           └── index.ts          # Route registration
├── components/
│   └── AI/
│       └── opencode/
│           └── OpenCodeChatPanel.tsx  # Updated to use useChatSession
└── tests/
    └── chat/
        └── useChatSession.test.ts     # Hook tests
```

## Usage

```tsx
import { useChatSession, createOpenCodeAdapter } from '@/lib/chat';

function MyChat() {
  const chat = useChatSession({
    endpoint: '/api/opencode/chat',
    adapterFactory: createOpenCodeAdapter,
    directory: '/path/to/project',
  });

  return (
    <div>
      {chat.messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      {chat.isLoading && <span>Streaming...</span>}
      {chat.error && <button onClick={chat.retry}>Retry</button>}
      <button onClick={() => chat.send('Hello!')}>Send</button>
    </div>
  );
}
```

## Answers to Open Questions

1. **How does OpenCode return responses?**
   - Uses `POST /session/:id/prompt_async` to send message
   - Uses `GET /event` SSE stream for real-time updates
   - Events: `message.created`, `part.updated`, `message.completed`

2. **Do we need to transform output?**
   - Yes, our backend `/api/opencode/chat/stream` transforms OpenCode events to simpler format:
     - `session` event (sessionId)
     - `text` event (accumulated content)
     - `message_complete` event
     - `error` event

3. **Multiple chat sessions?**
   - Yes, each `useChatSession` instance maintains its own session
   - Session ID is tracked and reused across messages

## Success Criteria ✅

- [x] Streaming responses work in UI
- [x] Can swap SDK by changing one adapter file
- [x] Components don't import SDK directly
- [x] Existing functionality preserved
- [x] Tests pass

## Related Files

- `plans/poor-mans-tool-calling.md` - Tool calling will integrate with this
- `features/repo-management-enhancements.md` - Repo context for chat
- `plans/next-features-opencode-repo.md` - Item #3 (OpenCode streaming) - **NOW DONE**
