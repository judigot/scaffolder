# Local Repo Cloning + OpenCode Integration Plan

## Goal

Make repository tabs function as a local git wrapper. When a user adds a repository, Scaffolder automatically clones it locally (public or private) and uses that local path for OpenCode. This plan is separate from the future "poor man" tool-calling system.

## Requirements

- Auto-clone on add, no manual "Clone" step.
- Use current Auth0 GitHub token to allow private repo cloning.
- Keep OpenCode integration isolated from existing Judas and repo-agent flows.
- Enforce workspace jail, timeouts, and safe output limits for any local commands.

## Configuration

- SCF_WORKSPACE_ROOT="/home/ubuntu/scaffolder-workspaces" (or env override)
- Use existing Auth0 metadata GitHub token (do not persist token in repo metadata).

## Data Model

Extend repository record with:

- localPath: string
- defaultBranch: string
- authType: "public" | "github-token"
- lastSync: ISO string

## Backend Routes (New)

1. POST /api/local-repo/clone
   - Input: { repoUrl, repoName?, branch? }
   - Behavior:
     - Resolve repo name from URL if not provided.
     - Compute target path under SCF_WORKSPACE_ROOT.
     - If repo exists locally, return existing path with a "already cloned" status.
     - Use GitHub token from Auth0 metadata if available.
     - Run: git clone (optionally with --branch)
     - Determine default branch from remote.
   - Output: { ok, repoPath, defaultBranch, status }

2. POST /api/local-repo/status
   - Input: { repoPath }
   - Output: { stdout, stderr, exitCode }

3. POST /api/local-repo/branches
4. POST /api/local-repo/checkout
5. POST /api/local-repo/diff
6. POST /api/local-repo/log

All local-repo endpoints must enforce:

- Realpath jail under SCF_WORKSPACE_ROOT
- Timeout and output truncation
- Allowlist command patterns

## Frontend Changes

- Update "Add Repository" flow in `RepoTabs`:
  - On add: call /api/local-repo/clone first.
  - If clone succeeds, add repository entry with localPath/defaultBranch.
  - If clone fails, show error and do not add.

- OpenCode local mode:
  - Pass repo.localPath as directory to /api/opencode/chat.
  - Display local path in the OpenCode panel header.

## Auth Strategy

- Use Auth0 GitHub token stored in user metadata for private repos.
- Clone URL format: https://x-access-token:<token>@github.com/owner/repo.git
- Redact token in logs and errors.

## Safety

- No interactive commands.
- Enforce command allowlist and path jail.
- Avoid logging full clone URL with token.

## Acceptance Criteria

- Adding a repository auto-clones locally.
- Private repos clone using GitHub token without prompting.
- Repo entry persists with localPath and defaultBranch.
- OpenCode uses localPath when in OpenCode mode.
- All local commands are jailed to SCF_WORKSPACE_ROOT.

## Tests (Smoke)

- Add public repo -> cloned path exists.
- Add private repo -> cloned path exists (token required).
- Re-adding existing repo -> no error, same path returned.
- OpenCode chat uses localPath directory.
