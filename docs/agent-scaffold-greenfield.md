# Agent scaffold greenfield

`POST /api/agent-scaffold` can fetch a **public GitHub starter** and optionally
create the destination repository before opening a draft PR.

Auth is unchanged: `SCAFFOLDER_AGENT_API_KEY` is the only agent credential.

Generation, leftover-placeholder checks, and `USE_USER_ENV` gates run
**before** `create_repo`. Invalid schema, a missing project, or a failed
build never creates a GitHub repository. If creation succeeds and a later
step fails (App write verification or publication), the error includes
the created repository URL and recovery guidance.

## Request shape

```json
{
  "project_url": "https://github.com/judigot/scaffolder-files/tree/main/Projects/template-monorepo",
  "template_repo": "https://github.com/judigot/template-monorepo",
  "target_repo": "judigot/booking-app",
  "create_repo": false,
  "schemaInfo": "<@@SCHEMA@@>\n@products:id:n#pk,name:s,price:n\n<@@/SCHEMA@@>"
}
```

Recipe default:

```yaml
$BASE: https://github.com/judigot/template-monorepo
```

Developers supply ordinary repository and project URLs. They do not look up
commit SHAs. The host resolves each selected source to **one immutable
commit per generation**, fetches that snapshot, and returns the SHAs as
provenance (`resolvedSha`, and `projectResolvedSha` when files were fetched
remotely).

## `template_repo`

Optional `github.com` repository URL. The request value overrides recipe
`$BASE` / `source`.

Accepted forms:

- Bare repository URL (happy path): `https://github.com/owner/repo`
- Optional `/tree/<branch|tag|sha>` or `/commit/<sha>`
- Optional subdirectory after a tree ref: `/tree/<ref>/path/in/repo`

The host reads GitHub repository metadata for the **actual default branch**
when no ref is given. It does not assume `main`. An explicit `main` tree URL
is a normal branch, not an error.

Any public GitHub owner/repo is accepted. The host validates the
`github.com` host and repository/ref path. Unavailable or private sources
return `TEMPLATE_SOURCE_UNAVAILABLE`. File blob URLs are rejected. If a
subdirectory is present, that folder is extracted; a missing subdirectory
returns `TEMPLATE_SUBDIRECTORY_NOT_FOUND` instead of silently downloading
the repository root.

The host fetches the GitHub **tarball at the resolved commit**. It does not
`git clone`.

That skeleton is the first core layer. In-house Cores (`/Core/nestjs-api`,
FILE_LOOP, and the rest of the recipe) still win after `replace:`.

Omit `template_repo` and omit `$BASE` / `source:` on the recipe → today's
bundled `/Core/template-monorepo`. Golden CI keeps that bundled Core and
does not download templates.

## `project_url`

Ordinary scaffolder-files folder URLs stay valid, including
`/tree/main/Projects/<name>`. `main` is not rejected as unpinned. Optional
`/tree/<branch|tag|sha>` still works. When the files repo is fetched
remotely, the host resolves that ref to one commit and records
`projectResolvedSha`.

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
$BASE: https://github.com/judigot/template-monorepo
replace:
  - apps/api/**                  # full apps/api subtree required before Nest lands
```

`$BASE` may be a local `/Core/...` path or a `github.com` repository URL
(the same forms as `template_repo`). The same resolver is used by the
agent API and `buildProjectFiles`. A remote recipe `$BASE` is fetched when
`template_repo` is omitted. An unsupported or unavailable base fails
explicitly; it is not ignored.

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

## Provenance

Successful responses include:

- `resolvedSha` — the template starter commit used for this generation
- `projectResolvedSha` — the scaffolder-files commit when that repo was
  fetched remotely

Those SHAs are also recorded on the default draft PR body. They are
host-resolved provenance, not developer inputs.
