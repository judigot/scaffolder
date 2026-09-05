# Agent scaffold greenfield

`POST /api/agent-scaffold` can fetch a **pinned** starter and optionally
create the destination repository before opening a draft PR.

Auth is unchanged: `SCAFFOLDER_AGENT_API_KEY` is the only agent credential.

Generation, leftover-placeholder checks, and `USE_USER_ENV` gates run
**before** `create_repo`. Invalid schema, a missing project, or a failed
build never creates a GitHub repository. If creation succeeds and a later
step fails (App write verification or publication), the error includes
the created repository URL and recovery guidance.

## `template_repo`

Optional GitHub URL with a **pinned commit SHA** (`/tree/<sha>` or
`/commit/<sha>`). The request value overrides recipe `$BASE` / `source`.

The host fetches the GitHub **tarball**. It does not `git clone`. Unpinned
`main` / `master` / `HEAD` is rejected (`TEMPLATE_REPO_UNPINNED`).

That skeleton is the first core layer. In-house Cores (`/Core/nestjs-api`,
FILE_LOOP, and the rest of the recipe) still win after `replace:`.

Omit `template_repo` and omit `$BASE` / `source:` on the recipe → today's
bundled `/Core/template-monorepo`. Golden CI keeps that bundled Core and
does not download templates.

### Allowlist

`TEMPLATE_REPO_ALLOWLIST` is currently hard-coded to
`judigot/template-monorepo`. Other public starter repositories are not
accepted yet. A later change can make the source policy configurable or
validate additional public GitHub repositories.

## `create_repo`

Optional boolean, default `false`. When `true`, creation runs only after
successful generation:

- Creates `target_repo` **private** with `auto_init: true` (needs a default
  branch so a draft PR can open).
- Collision returns typed `409 REPO_EXISTS`. Existing repos are not overwritten.
- **Organizations:** GitHub App installation token.
- **User accounts (`judigot` and other personal owners):** the existing
  Auth0-stored GitHub token / PAT path. The App cannot create personal repos.
- Agent-key callers have no stored user token. They get typed
  `400 USER_REPO_CREATE_UNSUPPORTED` ("create the user repo first"). The
  one-request “create my personal repo and scaffold it” workflow is
  therefore **organization-only** when using `SCAFFOLDER_AGENT_API_KEY`.
  The host will use a stored Auth0 GitHub token when the caller is a real
  Auth0 user. It will not ask the agent for a PAT and does not invent a
  second GitHub App.
- After create, the App must be able to write and open a draft PR (install
  on the new repo / all repos, or create-as-App for orgs). Empty repos are
  seeded with a README so `main` exists.
- If App write verification or publication fails after a successful
  create, the response keeps the original error `code` / `status` and
  `installationUrl`, and adds `details.repoCreated`, `details.repoUrl`,
  and `details.recovery`. Grant the App access if needed, then retry
  with `create_repo: false`. Do not retry with `create_repo: true`
  (`409 REPO_EXISTS`). Delete the empty repository only if you intend
  to create it again.

## Recipe DSL

```yaml
$BASE: /Core/template-monorepo   # or a pinned GitHub URL / source: <same>
replace:
  - apps/api/**                  # full apps/api subtree required before Nest lands
```

`$BASE` may be a local `/Core/...` path or a pinned allowlisted GitHub
URL. The same resolver is used by the agent API and `buildProjectFiles`.
A remote recipe `$BASE` is fetched when `template_repo` is omitted. An
unsupported or unpinned base fails explicitly; it is not ignored.

Request `template_repo` overrides `$BASE` / `source:`. Merge cannot delete
paths unless `replace:` says so. If a live Hono `apps/api` (package
dependencies **or** source imports) is still present when
`/Core/nestjs-api` would land, the host refuses
(`TEMPLATE_API_CONFLICT`). Replacing only `apps/api/package.json` is not
enough. After a Nest transition with a full `apps/api` replace, leftover
`hono` / `@hono/*` deps are stripped only from the replaced API package
and the workspace root — not from unrelated apps.

The typed conflict is preserved through the real builder message list, not
collapsed into `BUILD_FAILED`.

Leftover placeholder and `USE_USER_ENV` gates are unchanged.

## Agent skill follow-up

The `judigot/ai` scaffolder skill should document `template_repo`,
`create_repo`, the organization-only agent-key creation limit, and
create-then-publish recovery. That skill update is a linked follow-up,
not part of this host change.
