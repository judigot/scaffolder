# Plan: Next Features for OpenCode Repo Chats

## Goal

Capture the next set of production-ready enhancements for the OpenCode-based repo chat flow.

## Scope

1. ~~Delete local clone action (separate from remove metadata)~~ **DONE**
2. ~~Repo git status panel (branch + dirty state + last commit)~~ **DONE**
3. ~~OpenCode streaming in chat UI (SSE)~~ **DONE**
4. Per-repo directory override + header display
5. ~~Repo sync controls (fetch/pull) with guardrails~~ **DONE**

> See `plans/chat-abstraction-layer.md` for streaming implementation details.

> See `features/repo-management-enhancements.md` for shipped items.

## Requirements

- Keep OpenCode as default repo chat backend.
- Preserve Auth0 metadata as source of truth for repo list.
- Keep destructive actions explicit with confirmation.

## Implementation Steps

1. Add delete-local action
   - Backend: /api/local-repo/delete (workspace jail + confirm flag)
   - UI: confirm modal in repo dropdown

2. Repo status panel
   - Backend: /api/local-repo/status (already exists)
   - UI: show branch + dirty state + last commit in repo header

3. OpenCode streaming
   - Backend: /api/opencode/event proxy (SSE)
   - UI: incremental message rendering + tool output log

4. Directory override
   - Metadata: store per-repo directory override
   - UI: allow editing and show current path

5. Repo sync controls
   - Backend: /api/local-repo/fetch, /api/local-repo/pull
   - UI: buttons + status feedback

## Guardrails

- Workspace jail for all local operations
- Output truncation + timeouts
- Confirm before delete/pull

## Acceptance Criteria

- Users can safely delete local clones without removing metadata
- Repo status is visible at a glance
- Streaming responses work with OpenCode
- Directory overrides persist and are visible
- Fetch/pull actions are safe and logged

## Tests (smoke)

- Delete local clone removes directory but keeps repo list
- Status panel reflects clean/dirty changes
- Streaming shows partial responses
- Directory override persists after reload
- Fetch/pull works on a clean repo
