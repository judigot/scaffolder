# Feature: Repo Management Enhancements

## Summary

Extended the local repo integration with git sync controls (fetch/pull), status visibility, and the ability to delete local clones. Users can now see branch status, sync with remote, and manage disk space directly from the UI.

## What Shipped

- **Delete local clone**: Remove cloned repo from disk without removing from repo list.
- **Git fetch**: Fetch all remotes with pruning (`git fetch --all --prune`).
- **Git pull**: Fast-forward only pull (`git pull --ff-only`) with dirty-state guard.
- **Status panel**: Shows current branch, clean/dirty state, ahead/behind counts, last commit.
- **Confirmation modal**: Delete clone requires explicit confirmation.
- **Vercel build fixes**: Root tsconfig extends tsconfig.app.json for proper type checking.

## Key Files/Paths

| Path                                             | Purpose                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `src/app/routes/localRepo.ts`                    | Added `/delete`, `/fetch`, `/pull`, `/status-info` endpoints                       |
| `src/app/services/localRepoService.ts`           | Added `deleteRepository`, `fetchRepository`, `pullRepository`, `getRepoStatusInfo` |
| `src/components/AI/chat-app/RepoStatusPanel.tsx` | New component showing git status with action buttons                               |
| `src/components/AI/chat-app/RepoTabs.tsx`        | Integrated status panel and delete confirmation                                    |
| `src/components/AI/chat-app/ChatApp.tsx`         | Added `handleDeleteClone` handler                                                  |
| `tsconfig.json`                                  | Extends tsconfig.app.json for Vercel compatibility                                 |
| `package.json`                                   | Added `type-check` and `build:vercel` scripts                                      |

## API Endpoints

| Endpoint                      | Method | Body                          | Description                                        |
| ----------------------------- | ------ | ----------------------------- | -------------------------------------------------- |
| `/api/local-repo/delete`      | POST   | `{ repoPath, confirm: true }` | Delete local clone (requires confirmation)         |
| `/api/local-repo/fetch`       | POST   | `{ repoPath }`                | Fetch all remotes                                  |
| `/api/local-repo/pull`        | POST   | `{ repoPath }`                | Pull with fast-forward only                        |
| `/api/local-repo/status-info` | POST   | `{ repoPath }`                | Get branch, dirty state, ahead/behind, last commit |

## Status Panel Features

- **Branch display**: Current branch name with icon
- **Clean/Dirty badge**: Visual indicator of uncommitted changes
- **Ahead/Behind counts**: Shows commits ahead/behind remote
- **Last commit**: Short hash, date, and message
- **Fetch button**: Syncs remote refs with loading state
- **Pull button**: Disabled when dirty, shows error/success feedback
- **Delete clone**: Opens confirmation dialog

## Guardrails

- Pull disabled when working tree is dirty (prevents merge conflicts)
- Delete requires `confirm: true` in request body
- All paths validated against workspace root (jail)
- Timeouts on all git operations (60s for fetch/pull, 20s for status)

## Manual Testing

### Prerequisites

1. Start the dev server: `bun dev`
2. Open http://localhost:3000
3. Log in with Auth0

### Test 1: Add a Repository

1. Click **"Repositories"** tab (top nav)
2. Click **"+ Add"** button
3. Enter a repo: `judigot/ide` or any public repo
4. Click **Add Repository**
5. **Expected:** Repo appears in tabs, clones to `/home/ubuntu/scaffolder-workspaces/<owner>/<repo>`

### Test 2: View Repo Status Panel

1. Click the **dropdown arrow** on the repo tab
2. **Expected:** See "Local Clone" section with:
   - Branch name (e.g., `main`)
   - Clean/Modified badge
   - Last commit hash, date, message
   - Fetch and Pull buttons

### Test 3: Fetch

1. In the dropdown, click **Fetch**
2. **Expected:**
   - Button shows loading spinner
   - After ~1-2s, shows green success state
   - Resets after 2s

### Test 4: Pull (Clean Repo)

1. Make sure repo is clean (no local changes)
2. Click **Pull**
3. **Expected:**
   - Button shows loading spinner
   - Shows success or "already up to date"

### Test 5: Pull Disabled (Dirty Repo)

1. Make a change to the cloned repo:
   ```bash
   echo "test" >> /home/ubuntu/scaffolder-workspaces/judigot/ide/README.md
   ```
2. Close and reopen the dropdown
3. **Expected:**
   - Badge shows "Modified"
   - Pull button is **disabled/grayed out**
   - Hover shows tooltip "Cannot pull with uncommitted changes"
4. Revert the change:
   ```bash
   cd /home/ubuntu/scaffolder-workspaces/judigot/ide && git checkout README.md
   ```

### Test 6: Delete Local Clone

1. In the dropdown, click **"Delete local clone"**
2. **Expected:** Confirmation dialog appears
3. Click **Cancel** - dialog closes, nothing happens
4. Click **"Delete local clone"** again, then **Delete**
5. **Expected:**
   - Clone is deleted from disk
   - Status panel shows "No local clone available"
   - Repo **stays in the list** (metadata preserved)

### Test 7: Re-clone After Delete

1. Remove the repo (click "Remove repository" in dropdown)
2. Add it again
3. **Expected:** Clones fresh

## API Testing

Use the test script:

```bash
./manual-testing/test-local-repo-api.sh "<bearer-token>" "/home/ubuntu/scaffolder-workspaces/judigot/ide"
```

Get token from browser DevTools > Network > any API call > Authorization header.

Or test manually with curl:

```bash
TOKEN="your-bearer-token"
REPO="/home/ubuntu/scaffolder-workspaces/judigot/ide"

# Status info
curl -X POST http://localhost:3000/api/local-repo/status-info \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"repoPath\": \"$REPO\"}"

# Fetch
curl -X POST http://localhost:3000/api/local-repo/fetch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"repoPath\": \"$REPO\"}"

# Pull
curl -X POST http://localhost:3000/api/local-repo/pull \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"repoPath\": \"$REPO\"}"

# Delete (requires confirm: true)
curl -X POST http://localhost:3000/api/local-repo/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"repoPath\": \"$REPO\", \"confirm\": true}"
```
