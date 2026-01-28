# Plan: GitHub PR Creation for Serverless Environments

## Problem

Current implementation uses `gh` CLI for PR creation, which works locally but fails on Vercel/serverless platforms:

- ❌ `gh` binary not available in serverless containers
- ❌ No persistent authentication between function invocations
- ❌ Bash-based approach doesn't work in stateless environments

## Goal

Enable PR creation from both local agents (OpenCode) and serverless environments (Vercel) using a unified approach.

## Solution: Octokit Migration

Use `@octokit/rest` npm package for programmatic GitHub API access.

### Architecture

```
Local Agent (OpenCode)
  ↓ bash tool
  ↓ calls backend endpoint
  ↓
Backend API (Vercel/Local)
  ↓ @octokit/rest
  ↓ GitHub API
  ↓
PR Created
```

## Implementation Steps

### Phase 1: Add Octokit Dependency

```bash
bun add @octokit/rest
```

### Phase 2: Create GitHub Service

**File:** `src/app/services/githubService.ts`

```typescript
import { Octokit } from '@octokit/rest';

export interface CreatePROptions {
  token: string;
  owner: string;
  repo: string;
  title: string;
  head: string; // branch name
  base: string; // usually "main"
  body?: string;
  draft?: boolean;
}

export async function createPullRequest(options: CreatePROptions) {
  const octokit = new Octokit({ auth: options.token });

  const { data } = await octokit.pulls.create({
    owner: options.owner,
    repo: options.repo,
    title: options.title,
    head: options.head,
    base: options.base,
    body: options.body || '',
    draft: options.draft || false,
  });

  return {
    url: data.html_url,
    number: data.number,
    state: data.state,
    createdAt: data.created_at,
  };
}

export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  return data;
}

export async function updatePullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  updates: { title?: string; body?: string; state?: 'open' | 'closed' },
) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    ...updates,
  });
  return data;
}
```

### Phase 3: Create API Endpoint

**File:** `src/app/routes/github/pr.ts`

```typescript
import { Hono } from 'hono';
import {
  createPullRequest,
  getPullRequest,
} from '@/app/services/githubService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts'; // Extract from user metadata

const app = new Hono();

// Create PR
app.post('/create', async (c) => {
  const token = await getGitHubToken(c);
  if (!token) {
    return c.json({ error: 'GitHub token not found' }, 401);
  }

  const body = await c.req.json();
  const { owner, repo, title, head, base, body: prBody, draft } = body;

  try {
    const pr = await createPullRequest({
      token,
      owner,
      repo,
      title,
      head,
      base,
      body: prBody,
      draft,
    });

    return c.json({ ok: true, pr });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

// Get PR status
app.get('/:owner/:repo/:number', async (c) => {
  const token = await getGitHubToken(c);
  if (!token) {
    return c.json({ error: 'GitHub token not found' }, 401);
  }

  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const number = Number.parseInt(c.req.param('number'));

  try {
    const pr = await getPullRequest(token, owner, repo, number);
    return c.json({ ok: true, pr });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

export default app;
```

### Phase 4: Update Agent System Prompt

**File:** `src/prompts/repoAgent.ts`

Update agent instructions to use API endpoint instead of `gh`:

```typescript
export const REPO_AGENT_SYSTEM_PROMPT = `...

## Creating Pull Requests

After committing your changes, create a PR using the backend API:

\`\`\`bash
curl -X POST http://localhost:3000/api/github/pr/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "owner": "judigot",
    "repo": "scaffolder",
    "title": "feat: add dark mode",
    "head": "feat/add-dark-mode",
    "base": "main",
    "body": "Added dark mode toggle to settings"
  }'
\`\`\`

The API will return the PR URL and number.
...`;
```

### Phase 5: Update Chat Metadata

**File:** `src/components/AI/chat-app/types.ts`

```typescript
interface IChat {
  // ... existing fields
  branch?: string;
  prUrl?: string; // NEW
  prNumber?: number; // NEW
  prStatus?: 'open' | 'closed' | 'merged'; // NEW
}
```

### Phase 6: Frontend PR Display

Show PR status in chat rows:

```typescript
// src/components/AI/chat-app/ChatTree.tsx
{chat.prUrl && (
  <a
    href={chat.prUrl}
    target="_blank"
    className="text-xs text-blue-500 hover:underline"
  >
    #{chat.prNumber} ({chat.prStatus})
  </a>
)}
```

## Migration Strategy

### Option A: Immediate Switch (Breaking Change)

- Remove `gh` dependency from agent prompt
- Use Octokit API only
- Works on Vercel immediately

### Option B: Gradual Migration (Recommended)

1. Add Octokit API endpoint (works both local + Vercel)
2. Keep agent using `gh` locally (fallback)
3. Add auto-detection: try API first, fallback to `gh`
4. Eventually deprecate `gh` path

## Testing Plan

### Unit Tests

```typescript
// test agent can create PR via API
// test PR status fetching
// test error handling (invalid token, repo not found)
```

### Integration Tests

```bash
# 1. Local development
# 2. Vercel preview deployment
# 3. Agent creates branch + PR successfully
```

## Benefits

✅ Works on Vercel/serverless platforms  
✅ No CLI dependency  
✅ Programmatic control over PR metadata  
✅ Can track PR status in chat  
✅ Future: auto-update chat when PR merged

## Breaking Changes

- Agents need to call API endpoint instead of `gh` directly
- Requires GitHub token in Auth0 user metadata
- Need to handle API rate limits (5000 req/hour)

## Future Enhancements

1. **PR Status Polling**
   - Background job checks PR status
   - Updates chat metadata when merged

2. **PR Templates**
   - Pre-fill PR body with template
   - Include checklist items

3. **Auto-merge**
   - Merge PR when checks pass
   - Controlled via chat UI

4. **PR Reviews**
   - Code review agent comments on PR
   - Approval workflow

## Related

- `features/chat-branch-checkout.md` - Current branch checkout implementation
- `plans/poor-mans-tool-calling.md` - Git tool abstraction
- `CHANGELOG-REPO-FEATURES.md` - Feature timeline

## Status

📋 **Planned** - Not yet implemented

## Questions to Resolve

1. Should agents call API directly or continue using bash + `gh` locally?
2. Store PR metadata in Auth0 or separate database?
3. Handle GitHub API rate limits how?
4. Support GitHub Apps (higher rate limits) vs PATs?
