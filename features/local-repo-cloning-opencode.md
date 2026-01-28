# Feature: Local Repo Cloning + OpenCode Integration

## Summary

Repository tabs now function as a local git wrapper with OpenCode as the default chat backend. Adding a repository automatically clones it locally (public or private via Auth0 GitHub token), and all repo chats use OpenCode with the cloned directory.

## What Shipped

- **Auto-clone on add**: Adding a repo via `owner/repo` or full URL clones to `/home/ubuntu/scaffolder-workspaces/<owner>/<repo>`.
- **Private repo support**: Uses Auth0 GitHub token for authentication; tokens are redacted in logs.
- **OpenCode as default chat**: Repo chats now use `/api/opencode/chat` with the repo's `localPath`.
- **Session persistence**: Each chat stores `opencodeSessionId` for conversation continuity.
- **Remove repository**: Dropdown action removes repo from Auth0 metadata (local clone stays).
- **Git wrapper endpoints**: `/api/local-repo/clone`, `/api/local-repo/status`, `/api/local-repo/branches`, `/api/local-repo/checkout`.
- **Dev script**: `bun dev` auto-starts `opencode serve` if installed.

## Key Files/Paths

| Path                                               | Purpose                                                         |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `src/app/routes/opencode/`                         | OpenCode proxy routes (health, chat)                            |
| `src/app/routes/localRepo.ts`                      | Local repo clone + git wrapper endpoints                        |
| `src/app/services/opencodeService.ts`              | OpenCode config and header helpers                              |
| `src/app/services/localRepoService.ts`             | Git commands, workspace jail, token redaction                   |
| `src/components/AI/chat-app/ChatApp.tsx`           | Repo chat wiring to OpenCode                                    |
| `src/components/AI/chat-app/RepoTabs.tsx`          | Add/remove repo UI                                              |
| `src/components/AI/chat-app/types.ts`              | `IRepository` and `IChat` with `localPath`, `opencodeSessionId` |
| `src/components/AI/opencode/OpenCodeChatPanel.tsx` | Standalone OpenCode chat panel (available but not default)      |
| `src/hooks/useRepositories.ts`                     | Auth0 repo metadata persistence                                 |
| `package.json`                                     | `opencode:dev` script                                           |

## Configuration

| Variable                   | Default                              | Purpose                              |
| -------------------------- | ------------------------------------ | ------------------------------------ |
| `SCF_WORKSPACE_ROOT`       | `/home/ubuntu/scaffolder-workspaces` | Local clone root                     |
| `OPENCODE_URL`             | `http://127.0.0.1:4096`              | OpenCode server URL                  |
| `OPENCODE_SERVER_USERNAME` | (optional)                           | Basic auth username                  |
| `OPENCODE_SERVER_PASSWORD` | (optional)                           | Basic auth password                  |
| `OPENCODE_ALLOW_REMOTE`    | `false`                              | Allow non-localhost OpenCode servers |

## Verification

1. Run `bun dev` and confirm OpenCode health: `curl http://localhost:3000/api/opencode/health`
2. Add a repo using `owner/repo` shorthand; confirm clone succeeds.
3. Open repo chat, send a message, confirm OpenCode responds.
4. Remove repo from dropdown; confirm metadata clears, local clone persists.
5. Re-add same repo; confirm `already_cloned` status returned.
