# Plan: Worktree-Based Chat Isolation System

## Overview

Implement a deterministic isolation system where each chat gets its own git worktree. This guarantees parallel execution, prevents race conditions, and eliminates reliance on agent behavior.

**Core Principle: Never Trust the Agent**

The backend controls all git operations. The agent just works on files in its assigned directory.

## Goals

1. **Total Isolation**: Each chat works in its own worktree directory
2. **True Parallelism**: Multiple chats can run simultaneously on same repo
3. **Deterministic Validation**: Backend validates state before and after agent runs
4. **Sprint Support**: Architecture supports future sprint feature with parallel tasks

## Architecture

### Directory Structure

```
/home/ubuntu/scaffolder-workspaces/
└── judigot/
    └── ide/                              ← Main clone (reference only)
        ├── .git/
        ├── .worktrees/                   ← All chat worktrees live here
        │   ├── chat-abc123/              ← Chat A's isolated workspace
        │   │   ├── .git                  ← Worktree git link
        │   │   ├── file1.txt             ← Chat A's work
        │   │   └── .agent-task-context/
        │   │       ├── BRANCH_NAME       ← "feat/create-file1"
        │   │       └── CHAT_ID           ← "abc123"
        │   │
        │   └── chat-def456/              ← Chat B's isolated workspace
        │       ├── .git
        │       ├── file2.txt             ← Chat B's work
        │       └── .agent-task-context/
        │           ├── BRANCH_NAME
        │           └── CHAT_ID
        │
        └── (main repo files)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEW CHAT CREATED                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. WORKTREE SERVICE - Create Worktree                              │
│                                                                     │
│  POST /api/worktree/create                                          │
│  {                                                                  │
│    repoPath: "/home/ubuntu/scaffolder-workspaces/judigot/ide",      │
│    chatId: "abc123",                                                │
│    branchName: "feat/create-file1"  (optional, auto-generated)      │
│  }                                                                  │
│                                                                     │
│  Actions:                                                           │
│  - Validate repo exists                                             │
│  - Generate branch name if not provided                             │
│  - Create worktree: git worktree add .worktrees/chat-{id} -b {branch}│
│  - Create .agent-task-context/ with BRANCH_NAME and CHAT_ID         │
│  - Return worktreePath                                              │
│                                                                     │
│  Response:                                                          │
│  {                                                                  │
│    ok: true,                                                        │
│    worktreePath: "/home/.../ide/.worktrees/chat-abc123",            │
│    branch: "feat/create-file1"                                      │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. FRONTEND - Store Worktree Path in Chat                          │
│                                                                     │
│  chat.worktreePath = response.worktreePath                          │
│  chat.branch = response.branch                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       USER SENDS MESSAGE                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. PRE-FLIGHT VALIDATION                                           │
│                                                                     │
│  POST /api/worktree/validate                                        │
│  {                                                                  │
│    worktreePath: "/home/.../ide/.worktrees/chat-abc123"             │
│  }                                                                  │
│                                                                     │
│  Checks:                                                            │
│  - Worktree exists                                                  │
│  - Is a valid git worktree                                          │
│  - On expected branch (read BRANCH_NAME file)                       │
│  - Working directory is clean (or has only our changes)             │
│                                                                     │
│  Response:                                                          │
│  {                                                                  │
│    valid: true,                                                     │
│    branch: "feat/create-file1",                                     │
│    isClean: true,                                                   │
│    commitCount: 0                                                   │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SEND TO OPENCODE                                                │
│                                                                     │
│  POST /api/opencode/chat                                            │
│  {                                                                  │
│    message: "Create file1.txt...",                                  │
│    sessionId: "...",                                                │
│    directory: chat.worktreePath,  ← WORKTREE PATH, NOT REPO PATH    │
│    systemPrompt: WORKTREE_AGENT_PROMPT                              │
│  }                                                                  │
│                                                                     │
│  Agent works ONLY in the worktree directory.                        │
│  Cannot affect other chats or main repo.                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. POST-FLIGHT VALIDATION                                          │
│                                                                     │
│  POST /api/worktree/validate-result                                 │
│  {                                                                  │
│    worktreePath: "/home/.../ide/.worktrees/chat-abc123"             │
│  }                                                                  │
│                                                                     │
│  Checks:                                                            │
│  - Still on expected branch                                         │
│  - Changes were committed (or staged)                               │
│  - No unexpected branch switches                                    │
│                                                                     │
│  Response:                                                          │
│  {                                                                  │
│    valid: true,                                                     │
│    branch: "feat/create-file1",                                     │
│    newCommits: 1,                                                   │
│    filesChanged: ["file1.txt"]                                      │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. UPDATE UI                                                       │
│                                                                     │
│  - Show validation results to user                                  │
│  - Update chat metadata if needed                                   │
│  - Refresh file tree (from worktree path)                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Switching Chats (Code Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER CLICKS DIFFERENT CHAT                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NO CHECKOUT NEEDED!                                                │
│                                                                     │
│  Each chat has its own worktree.                                    │
│  Just change which path the Code tab reads from.                    │
│                                                                     │
│  Before: Fetch files from /repo/.worktrees/chat-abc123/             │
│  After:  Fetch files from /repo/.worktrees/chat-def456/             │
│                                                                     │
│  Instant switch, no git operations.                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Create Worktree

```
POST /api/worktree/create
```

**Request:**

```json
{
  "repoPath": "/home/ubuntu/scaffolder-workspaces/judigot/ide",
  "chatId": "abc123",
  "branchName": "feat/create-file1" // optional
}
```

**Response:**

```json
{
  "ok": true,
  "worktreePath": "/home/ubuntu/scaffolder-workspaces/judigot/ide/.worktrees/chat-abc123",
  "branch": "feat/create-file1"
}
```

**Implementation:**

```typescript
// 1. Validate repo exists
// 2. Generate branch name if not provided: feat/chat-{chatId}-{timestamp}
// 3. Create .worktrees directory if not exists
// 4. Run: git worktree add .worktrees/chat-{chatId} -b {branchName}
// 5. Create .agent-task-context/BRANCH_NAME
// 6. Create .agent-task-context/CHAT_ID
// 7. Return worktree path
```

### 2. Validate Worktree (Pre-flight)

```
POST /api/worktree/validate
```

**Request:**

```json
{
  "worktreePath": "/home/.../ide/.worktrees/chat-abc123"
}
```

**Response:**

```json
{
  "valid": true,
  "branch": "feat/create-file1",
  "expectedBranch": "feat/create-file1",
  "branchMatch": true,
  "isClean": true,
  "uncommittedFiles": [],
  "commitCount": 2
}
```

**Validation Rules:**

- Worktree path exists
- Is a valid git worktree (has .git file)
- Current branch matches BRANCH_NAME file
- Report working directory status

### 3. Validate Result (Post-flight)

```
POST /api/worktree/validate-result
```

**Request:**

```json
{
  "worktreePath": "/home/.../ide/.worktrees/chat-abc123",
  "expectedCommitsBefore": 2
}
```

**Response:**

```json
{
  "valid": true,
  "branch": "feat/create-file1",
  "branchMatch": true,
  "newCommits": 1,
  "totalCommits": 3,
  "lastCommitMessage": "Add file1.txt",
  "filesChanged": ["file1.txt"],
  "hasUncommittedChanges": false
}
```

**Validation Rules:**

- Still on expected branch (didn't switch)
- New commits were made (agent did work)
- Report what changed

### 4. List Worktrees

```
POST /api/worktree/list
```

**Request:**

```json
{
  "repoPath": "/home/ubuntu/scaffolder-workspaces/judigot/ide"
}
```

**Response:**

```json
{
  "ok": true,
  "worktrees": [
    {
      "path": "/home/.../ide/.worktrees/chat-abc123",
      "branch": "feat/create-file1",
      "chatId": "abc123",
      "commitCount": 3,
      "lastActivity": "2024-01-28T19:00:00Z"
    },
    {
      "path": "/home/.../ide/.worktrees/chat-def456",
      "branch": "feat/create-file2",
      "chatId": "def456",
      "commitCount": 1,
      "lastActivity": "2024-01-28T19:05:00Z"
    }
  ]
}
```

### 5. Get Worktree Files

```
POST /api/worktree/files
```

**Request:**

```json
{
  "worktreePath": "/home/.../ide/.worktrees/chat-abc123"
}
```

**Response:**

```json
{
  "ok": true,
  "files": [
    { "name": "file1.txt", "type": "file", "path": "/file1.txt" },
    { "name": "cursor", "type": "directory", "path": "/cursor" }
  ]
}
```

## Updated Chat Type

```typescript
interface IChat {
  id: string;
  title: string;
  description: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
  prStatus: 'draft' | 'ready' | 'merged' | null;
  prUrl?: string;
  opencodeSessionId?: string;

  // Worktree fields (NEW)
  worktreePath?: string; // Full path to worktree directory
  branch?: string; // Git branch name (derived from worktree)
  worktreeStatus?: 'creating' | 'ready' | 'error';
}
```

## Updated System Prompt

The agent no longer needs to manage branches - the worktree handles that.

```typescript
export const WORKTREE_AGENT_PROMPT = `You are a coding agent working in an isolated git worktree.

## Your Environment

- You are in a dedicated worktree directory
- The branch is already created and checked out for you
- You have full isolation - your changes cannot affect other work

## Your Workflow

1. **Make changes** - Create, edit, or delete files as needed
2. **Commit often** - Use \`git add . && git commit -m "message"\`
3. **Provide summary** - Tell user what files you changed and what commits you made

## Rules

- ✅ Create and edit files freely
- ✅ Commit your changes with clear messages
- ✅ Focus on the task at hand
- ❌ Do NOT checkout other branches
- ❌ Do NOT run git worktree commands
- ❌ Do NOT modify .agent-task-context/ files

## Response Format

After completing work:

\`\`\`
✓ Files: 2 modified (Component.tsx, styles.css)
✓ Commits: 1 commit ("Add responsive styles")

Summary: Added responsive CSS for mobile devices.
\`\`\`

Keep responses concise. Focus on implementation.`;
```

## Frontend Changes

### 1. New Chat Flow

```typescript
// In handleNewChat()
const handleNewChat = async () => {
  if (!activeRepo?.localPath) return;

  // 1. Create chat object
  const newChat = {
    id: `chat-${Date.now()}`,
    title: 'New feature',
    worktreeStatus: 'creating',
    // ...
  };

  // 2. Add to state
  addChat(newChat);

  // 3. Create worktree in background
  try {
    const token = await getAccessTokenSilently();
    const response = await fetch('/api/worktree/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        repoPath: activeRepo.localPath,
        chatId: newChat.id,
      }),
    });

    const data = await response.json();

    // 4. Update chat with worktree info
    updateChat(newChat.id, {
      worktreePath: data.worktreePath,
      branch: data.branch,
      worktreeStatus: 'ready',
    });
  } catch (error) {
    updateChat(newChat.id, {
      worktreeStatus: 'error',
    });
  }
};
```

### 2. Send Message Flow

```typescript
// In handleSendMessage()
const handleSendMessage = async (chatId: string, content: string) => {
  const chat = getChat(chatId);

  // 1. Ensure worktree exists
  if (!chat.worktreePath) {
    // Create worktree if not exists (lazy creation)
    await createWorktreeForChat(chat);
  }

  // 2. Pre-flight validation
  const preValidation = await validateWorktree(chat.worktreePath);
  if (!preValidation.valid) {
    showError('Worktree validation failed: ' + preValidation.error);
    return;
  }

  // 3. Send to OpenCode with WORKTREE path
  const response = await fetch('/api/opencode/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      sessionId: chat.opencodeSessionId,
      directory: chat.worktreePath, // ← WORKTREE PATH
      systemPrompt: WORKTREE_AGENT_PROMPT,
    }),
  });

  // 4. Post-flight validation
  const postValidation = await validateWorktreeResult(chat.worktreePath);

  // 5. Update UI with validation results
  if (postValidation.newCommits > 0) {
    showSuccess(`Agent made ${postValidation.newCommits} commit(s)`);
  }

  // 6. Refresh file tree (from worktree)
  await refetchWorktreeFiles(chat.worktreePath);
};
```

### 3. Switch Chat Flow (Code Tab)

```typescript
// In handleSelectChat()
const handleSelectChat = async (chatId: string) => {
  setActiveChatId(chatId);

  const chat = getChat(chatId);

  // NO CHECKOUT NEEDED!
  // Just fetch files from this chat's worktree
  if (chat.worktreePath) {
    await refetchWorktreeFiles(chat.worktreePath);
  }
};
```

### 4. File Fetching Hook Update

```typescript
// useWorktreeFiles.ts (new hook)
export function useWorktreeFiles(worktreePath?: string) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  return useQuery({
    queryKey: ['worktreeFiles', worktreePath],
    queryFn: async () => {
      if (!worktreePath || !isAuthenticated) return [];

      const token = await getAccessTokenSilently();
      const response = await fetch('/api/worktree/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ worktreePath }),
      });

      const data = await response.json();
      return data.files || [];
    },
    enabled: !!worktreePath && isAuthenticated,
  });
}
```

## Backend Implementation

### New Service: worktreeService.ts

```typescript
// src/app/services/worktreeService.ts

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

export interface WorktreeInfo {
  path: string;
  branch: string;
  chatId: string;
  commitCount: number;
}

export async function createWorktree(
  repoPath: string,
  chatId: string,
  branchName?: string,
): Promise<{ worktreePath: string; branch: string }> {
  // 1. Validate repo
  if (!existsSync(repoPath)) {
    throw new Error('Repository not found');
  }

  // 2. Generate branch name if not provided
  const branch = branchName || `feat/chat-${chatId}`;
  const branchSlug = branch.replace(/\//g, '-');

  // 3. Create .worktrees directory
  const worktreesDir = path.join(repoPath, '.worktrees');
  if (!existsSync(worktreesDir)) {
    mkdirSync(worktreesDir, { recursive: true });
  }

  // 4. Create worktree
  const worktreePath = path.join(worktreesDir, `chat-${chatId}`);

  execSync(`git worktree add "${worktreePath}" -b "${branch}"`, {
    cwd: repoPath,
    encoding: 'utf-8',
  });

  // 5. Create .agent-task-context
  const contextDir = path.join(worktreePath, '.agent-task-context');
  mkdirSync(contextDir, { recursive: true });
  writeFileSync(path.join(contextDir, 'BRANCH_NAME'), branch);
  writeFileSync(path.join(contextDir, 'CHAT_ID'), chatId);

  return { worktreePath, branch };
}

export async function validateWorktree(worktreePath: string): Promise<{
  valid: boolean;
  branch: string;
  expectedBranch: string;
  branchMatch: boolean;
  isClean: boolean;
  uncommittedFiles: string[];
  commitCount: number;
  error?: string;
}> {
  try {
    // 1. Check worktree exists
    if (!existsSync(worktreePath)) {
      return { valid: false, error: 'Worktree not found' /* ... */ };
    }

    // 2. Get current branch
    const branch = execSync('git branch --show-current', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).trim();

    // 3. Get expected branch from BRANCH_NAME file
    const branchNameFile = path.join(
      worktreePath,
      '.agent-task-context',
      'BRANCH_NAME',
    );
    const expectedBranch = readFileSync(branchNameFile, 'utf-8').trim();

    // 4. Check working directory status
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    });
    const uncommittedFiles = status.split('\n').filter(Boolean);

    // 5. Count commits on branch
    const commitCount = parseInt(
      execSync('git rev-list --count HEAD', {
        cwd: worktreePath,
        encoding: 'utf-8',
      }).trim(),
    );

    return {
      valid: true,
      branch,
      expectedBranch,
      branchMatch: branch === expectedBranch,
      isClean: uncommittedFiles.length === 0,
      uncommittedFiles,
      commitCount,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      /* ... */
    };
  }
}

export async function validateWorktreeResult(
  worktreePath: string,
  commitCountBefore: number,
): Promise<{
  valid: boolean;
  branch: string;
  branchMatch: boolean;
  newCommits: number;
  totalCommits: number;
  lastCommitMessage: string;
  filesChanged: string[];
  hasUncommittedChanges: boolean;
}> {
  const validation = await validateWorktree(worktreePath);

  const lastCommitMessage = execSync('git log -1 --format=%s', {
    cwd: worktreePath,
    encoding: 'utf-8',
  }).trim();

  const filesChanged = execSync(
    "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo ''",
    {
      cwd: worktreePath,
      encoding: 'utf-8',
    },
  )
    .split('\n')
    .filter(Boolean);

  return {
    valid: validation.valid && validation.branchMatch,
    branch: validation.branch,
    branchMatch: validation.branchMatch,
    newCommits: validation.commitCount - commitCountBefore,
    totalCommits: validation.commitCount,
    lastCommitMessage,
    filesChanged,
    hasUncommittedChanges: !validation.isClean,
  };
}

export async function getWorktreeFiles(worktreePath: string): Promise<any[]> {
  // Reuse existing getLocalRepoFiles logic but with worktree path
  // ...
}

export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  const output = execSync('git worktree list --porcelain', {
    cwd: repoPath,
    encoding: 'utf-8',
  });

  // Parse output and return worktree info
  // ...
}
```

### New Routes: /api/worktree/\*

```typescript
// src/app/routes/worktree.ts

import { Hono } from 'hono';
import {
  createWorktree,
  validateWorktree,
  validateWorktreeResult,
  getWorktreeFiles,
  listWorktrees,
} from '@/app/services/worktreeService.ts';

const app = new Hono();

app.post('/create', async (c) => {
  const { repoPath, chatId, branchName } = await c.req.json();

  // Validation
  if (!repoPath || !chatId) {
    return c.json({ error: 'repoPath and chatId required' }, 400);
  }

  try {
    const result = await createWorktree(repoPath, chatId, branchName);
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }
});

app.post('/validate', async (c) => {
  const { worktreePath } = await c.req.json();
  const result = await validateWorktree(worktreePath);
  return c.json(result);
});

app.post('/validate-result', async (c) => {
  const { worktreePath, commitCountBefore } = await c.req.json();
  const result = await validateWorktreeResult(worktreePath, commitCountBefore);
  return c.json(result);
});

app.post('/files', async (c) => {
  const { worktreePath } = await c.req.json();
  const files = await getWorktreeFiles(worktreePath);
  return c.json({ ok: true, files });
});

app.post('/list', async (c) => {
  const { repoPath } = await c.req.json();
  const worktrees = await listWorktrees(repoPath);
  return c.json({ ok: true, worktrees });
});

export default app;
```

## Implementation Order (TODO)

### Phase 1: Backend Worktree Service

- [ ] **1.1** Create `src/app/services/worktreeService.ts`
  - [ ] `createWorktree()` function
  - [ ] `validateWorktree()` function
  - [ ] `validateWorktreeResult()` function
  - [ ] `getWorktreeFiles()` function
  - [ ] `listWorktrees()` function

- [ ] **1.2** Create `src/app/routes/worktree.ts`
  - [ ] POST `/api/worktree/create`
  - [ ] POST `/api/worktree/validate`
  - [ ] POST `/api/worktree/validate-result`
  - [ ] POST `/api/worktree/files`
  - [ ] POST `/api/worktree/list`

- [ ] **1.3** Register routes in `src/app/routes/index.ts`

- [ ] **1.4** Add auth middleware to worktree routes

### Phase 2: Update System Prompt

- [ ] **2.1** Create new `WORKTREE_AGENT_PROMPT` in `src/prompts/repoAgent.ts`
  - [ ] Remove all branch management instructions
  - [ ] Focus on file changes and commits only
  - [ ] Add rules about not touching .agent-task-context/

### Phase 3: Update Chat Types

- [ ] **3.1** Update `IChat` interface in `src/components/AI/chat-app/types.ts`
  - [ ] Add `worktreePath?: string`
  - [ ] Add `worktreeStatus?: "creating" | "ready" | "error"`

### Phase 4: Frontend - New Chat Flow

- [ ] **4.1** Update `handleNewChat()` in `ChatApp.tsx`
  - [ ] Create worktree when new chat is created
  - [ ] Store worktreePath in chat state
  - [ ] Handle loading/error states

### Phase 5: Frontend - Send Message Flow

- [ ] **5.1** Update `handleSendMessage()` in `ChatApp.tsx`
  - [ ] Pre-flight validation before sending to OpenCode
  - [ ] Use `chat.worktreePath` instead of `repo.localPath`
  - [ ] Post-flight validation after response
  - [ ] Show validation results to user

- [ ] **5.2** Create `useWorktreeFiles` hook
  - [ ] Fetch files from worktree path
  - [ ] Replace `useLocalRepoFiles` usage for chats with worktrees

### Phase 6: Frontend - Switch Chat Flow

- [ ] **6.1** Update `handleSelectChat()` and `handleSelectRegularChat()`
  - [ ] Remove checkout logic
  - [ ] Just switch which worktree path to display

- [ ] **6.2** Update Code tab file display
  - [ ] Use active chat's worktreePath
  - [ ] Instant switch (no git operations)

### Phase 7: Testing

- [ ] **7.1** Create automated tests for worktree service
- [ ] **7.2** Create E2E test for full flow
- [ ] **7.3** Manual testing with parallel chats

### Phase 8: Documentation

- [ ] **8.1** Update feature documentation
- [ ] **8.2** Update CHANGELOG

## Test Scenarios

### Test 1: Basic Worktree Isolation

1. Create Chat A
2. Verify worktree created at `.worktrees/chat-{id}`
3. Send message: "Create file1.txt"
4. Verify file1.txt exists in Chat A's worktree only
5. Create Chat B
6. Verify separate worktree created
7. Send message: "Create file2.txt"
8. Verify file2.txt exists in Chat B's worktree only
9. Switch between chats in Code tab
10. Verify correct files shown for each

### Test 2: Parallel Execution

1. Create Chat A and Chat B
2. Send message to Chat A (don't wait)
3. Immediately send message to Chat B
4. Both should work simultaneously
5. Neither should affect the other

### Test 3: Validation

1. Create chat with worktree
2. Manually switch branch in worktree (simulate agent misbehavior)
3. Send message
4. Pre-flight validation should catch branch mismatch
5. User should see error

### Test 4: Sprint Simulation

1. Create 5 chats (simulating sprint tasks)
2. Send messages to all 5
3. All should work in parallel
4. All should have isolated worktrees
5. Can switch between any of them instantly

## Success Criteria

- [ ] Each chat gets its own worktree
- [ ] Chats can run in parallel without conflicts
- [ ] Switching chats is instant (no checkout)
- [ ] Pre-flight validation catches issues before agent runs
- [ ] Post-flight validation reports what agent did
- [ ] Agent cannot pollute other chats or main repo
- [ ] System prompt is simplified (no branch management)
- [ ] Code tab shows correct files for active chat

## Risks & Mitigations

| Risk                               | Mitigation                                       |
| ---------------------------------- | ------------------------------------------------ |
| Worktree creation fails            | Return error, don't allow chat to proceed        |
| Agent ignores worktree boundaries  | Validation catches, contained to worktree anyway |
| Too many worktrees (disk space)    | Future: cleanup strategy                         |
| Branch name conflicts              | Use chat ID in branch name for uniqueness        |
| Git worktree command not available | Check git version on startup                     |

## Future Enhancements (Out of Scope)

- Worktree cleanup (when chat deleted, branch merged)
- Worktree status UI (show all worktrees for repo)
- Merge worktree back to main (PR creation)
- Worktree templates (pre-configured files)
- Sprint-level worktree management
