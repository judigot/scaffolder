# Plan: Use Local Files for Cloned Repos

## Problem

When a private repo is cloned locally via `/api/local-repo/clone`, the app still tries to fetch files via GitHub's public ZIP endpoint (`getUserFilesFromPublicRepo`), which fails because:

1. Private repos don't have public ZIP archives
2. The files are already available on disk

Error: `{"error":"Failed to fetch repository files","message":"invalid zip data"}`

## Solution

**Check if a repo is cloned locally first.** If it is, read files from the local clone instead of fetching from GitHub.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Request: "Get files for github.com/user/repo"        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  Decision Logic (Backend)                                       │
│                                                                 │
│  1. Parse repo URL → extract owner/repo                         │
│  2. Check if local clone exists at:                             │
│     /home/ubuntu/scaffolder-workspaces/{owner}/{repo}           │
│  3. If local clone exists → read from local filesystem          │
│  4. If not cloned → try GitHub ZIP (public) or API (with auth)  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
┌────────▼────────┐                 ┌──────────▼──────────┐
│  Local Clone    │                 │  Remote GitHub      │
│  (filesystem)   │                 │  (ZIP or API)       │
└─────────────────┘                 └─────────────────────┘
```

## Implementation Steps

### Phase 1: Backend - Add Local Clone File Reading

- [ ] Create `/api/local-repo/files` endpoint
  - Input: `{ repoUrl: string }` or `{ repoPath: string }`
  - Output: `IStructure[]` (same format as other endpoints)
  - Logic: Use `convertLocalFilesToIStructure()` on the clone path

- [ ] Update `localRepoService.ts`
  - Add `getLocalRepoFiles(repoPath: string): Promise<IStructure[]>`
  - Reuse existing `convertLocalFilesToIStructure()` utility

### Phase 2: Backend - Smart Routing

- [ ] Create `/api/repo-files` unified endpoint (or update `getUserFilesFromPublicRepo`)
  - Input: `{ repoUrl: string }`
  - Logic:
    1. Parse URL → get owner/repo
    2. Build expected local path: `{WORKSPACE_DIR}/{owner}/{repo}`
    3. Check if path exists and is a git repo
    4. If local: read from filesystem
    5. If remote: try ZIP download (existing logic)
  - Output: `IStructure[]` with metadata `{ source: 'local' | 'remote' }`

### Phase 3: Frontend - Update Hooks

- [ ] Update `useRemoteRepoFiles` to use the unified endpoint
  - No change needed if backend handles routing
  - OR add explicit `preferLocal: boolean` option

- [ ] Update `useUserFiles` (optional)
  - Currently used for template files, may not need changes

### Phase 4: UI Feedback

- [ ] Show indicator when reading from local clone vs remote
- [ ] Add "Refresh from remote" button for cloned repos (force re-fetch)

## File Changes

| File                                           | Change                    |
| ---------------------------------------------- | ------------------------- |
| `src/app/routes/localRepo.ts`                  | Add `/files` endpoint     |
| `src/app/services/localRepoService.ts`         | Add `getLocalRepoFiles()` |
| `src/app/routes/getUserFilesFromPublicRepo.ts` | Add local-first check     |
| `src/hooks/useRemoteRepoFiles.ts`              | May need minor updates    |

## API Design

### Option A: Unified Endpoint (Recommended)

```
POST /api/repo-files
Body: { repoUrl: "https://github.com/user/repo" }
Response: {
  files: IStructure[],
  source: "local" | "remote",
  localPath?: string
}
```

### Option B: Separate Endpoints

```
GET /api/local-repo/files?path=/path/to/clone
POST /api/getUserFilesFromPublicRepo (existing, for remote)
```

Frontend decides which to call based on clone status.

## Decision

**Go with Option A** - Unified endpoint is simpler for frontend and encapsulates the local-vs-remote logic in one place.

## Edge Cases

1. **Repo cloned but outdated** - User might want fresh files from remote
   - Solution: Add `forceRemote: boolean` param

2. **Repo cloned but different branch** - Local might be on feature branch
   - Solution: Return branch info in response, let user checkout

3. **Partial clone or corrupted** - Local path exists but isn't valid git repo
   - Solution: Validate with `git status`, fallback to remote

4. **Submodules** - Cloned repo has submodules not initialized
   - Solution: Run `git submodule update --init` or warn user

## Success Criteria

- [ ] Private cloned repos show files without "invalid zip data" error
- [ ] Public repos continue to work (fetch from remote if not cloned)
- [ ] UI indicates file source (local/remote)
- [ ] Can force refresh from remote if needed
