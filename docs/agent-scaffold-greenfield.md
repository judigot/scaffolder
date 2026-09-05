# Agent scaffold greenfield

`POST /api/agent-scaffold` can now fetch a **pinned** starter and optionally
create the destination repository before opening a draft PR.

Auth is unchanged: `SCAFFOLDER_AGENT_API_KEY` is the only agent credential.

## `template_repo`

Optional GitHub URL with a **pinned commit SHA** (`/tree/<sha>` or
`/commit/<sha>`). Allowlist starts at `judigot/template-monorepo`.

The host fetches the GitHub **tarball**. It does not `git clone`. Unpinned
`main` / `master` / `HEAD` is rejected (`TEMPLATE_REPO_UNPINNED`).

That skeleton is the first core layer. In-house Cores (`/Core/nestjs-api`,
FILE_LOOP, and the rest of the recipe) still win after `replace:`.

Omit `template_repo` and omit `$BASE` / `source:` on the recipe → today's
bundled `/Core/template-monorepo`. Golden CI keeps that bundled Core and
does not download templates.

## `create_repo`

Optional boolean, default `false`. When `true`:

- Creates `target_repo` **private** with `auto_init: true` (needs a default
  branch so a draft PR can open).
- Collision returns typed `409 REPO_EXISTS`. Existing repos are not overwritten.
- **Organizations:** GitHub App installation token.
- **User accounts (`judigot` and other personal owners):** the existing
  Auth0-stored GitHub token / PAT path. The App cannot create personal repos.
- Agent-key callers have no stored user token. They get typed
  `400 USER_REPO_CREATE_UNSUPPORTED` ("create the user repo first"). The
  host will use a stored Auth0 GitHub token when the caller is a real
  Auth0 user. It will not ask the agent for a PAT and does not invent a
  second GitHub App.
- After create, the App must be able to write and open a draft PR (install
  on the new repo / all repos, or create-as-App for orgs). Empty repos are
  seeded with a README so `main` exists.

## Recipe DSL

```yaml
$BASE: /Core/template-monorepo   # or source: <same>
replace:
  - apps/api/**                  # required before Nest lands on a live Hono starter
```

Request `template_repo` overrides `$BASE` / `source:`. Merge cannot delete
paths unless `replace:` says so. If a live Hono `apps/api` is still present
when `/Core/nestjs-api` would land, the host refuses
(`TEMPLATE_API_CONFLICT`). After `replace:`, leftover `hono` /
`@hono/*` package.json deps are stripped.

Leftover placeholder and `USE_USER_ENV` gates are unchanged.
