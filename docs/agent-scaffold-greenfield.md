# Agent scaffold API

`POST /api/agent-scaffold` combines a public starter repository with a
Scaffolder recipe and opens or updates a pull request. It also supports
existing in-house Core templates and optional destination repository creation.

## Authentication

- `Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY` authenticates an agent to
  Scaffolder. Existing Auth0 bearer authentication still works.
- Optional `X-GitHub-Token: $GITHUB_PAT` selects a request-scoped PAT for **all
  destination operations**: repository creation, commits, branches and PRs.
  It never falls back to the App or a stored token, and is not stored or sent
  to public source downloads. SDK credential logging is disabled; errors redact
  the supplied token. Keep PATs out of JSON, URLs, recipe files and commits.
- Without this header, publication uses the Scaffolder GitHub App. Install it
  on the destination with Contents and Pull requests write permissions.
- A fine-grained PAT needs access to the destination, Contents and Pull requests
  write permissions; creation also needs Administration write. Workflow files
  require Workflows write. Organization policies and token approvals still apply.
  A classic PAT commonly needs `repo` and, for workflow files, `workflow`.

Hosts serving many generations should configure the optional server-only
`SCAFFOLDER_SOURCE_GITHUB_TOKEN` for public repository reads. It is separate
from request PATs and is sent only to `api.github.com`, with redirects disabled.
Without it, GitHub's unauthenticated 60 requests/IP/hour limit applies: each
remote source uses two REST reads, so two-source generations allow roughly
15 requests/hour per shared IP. Rate-limit failures explain how to recover.
This setting is never exposed to the browser. Browser-only builds use public
unauthenticated reads. See [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## Public sources and in-house Core

`template_repo: "https://github.com/judigot/template-monorepo"` uses that
repository's actual default branch. Any public GitHub repository is accepted;
it need not be marked as a GitHub template. No allowlist or user-supplied
commit hash is required. Optional `/tree/<branch-or-tag>` and `/commit/<sha>`
URLs work too. Encode slashes inside template branch names as `%2F`.
Template subdirectory URLs such as `/tree/main/packages/starter` select
that folder as the base. Missing folders fail explicitly; the repository
root is never silently substituted.

The host resolves the selected ref once to a commit, downloads its tarball,
and returns `resolvedSha` (and `projectResolvedSha` for a remote recipe). Source scripts are not executed. Downloads have
30-second timeouts, a 25 MiB compressed limit, a 100 MiB extraction limit
and a 20,000-file limit. Symbolic links and submodules are not copied.

`project_url` selects `Projects/<name>` or its `structure.yaml` inside a public
scaffolder-files repository, for example:
`https://github.com/judigot/scaffolder-files/tree/main/Projects/ORM%20Schema%20-%20Knex`.
Branches (including slash-containing branch names), tags and commits resolve
to a commit before downloading. Explicit URLs always fetch the requested source,
including URLs to the official scaffolder-files repository. `project: "ORM Schema - Knex"`
continues to use the bundled catalog with no remote recipe fetch.

Recipes retain their in-house Core imports. A remote starter replaces only the
bundled `/Core/template-monorepo` base import; other imported and project-local
Cores continue to apply. Without `template_repo` or a remote recipe base,
existing Core behavior and offline golden generation are unchanged.

## Recipe DSL

```yaml
$BASE: https://github.com/judigot/template-monorepo
replace:
  - apps/api/**
$USE_CORE:
  - /Core/nestjs-api
```

`$BASE` also accepts a local `/Core/...` path. `$SOURCE` and `source` aliases
work. Request `template_repo` overrides the recipe base. The same resolver is
used by the API and the project builder.

The starter is the first layer, followed by Core imports, local Core and
recipe-generated files. `replace` removes matching starter paths before
Core overlays. Replacing Hono with Nest requires the entire `apps/api/**`
subtree; otherwise generation fails with `TEMPLATE_API_CONFLICT`.
After that replacement, Hono dependencies are removed from the root/API
packages, preserving unrelated applications' dependencies.

## Greenfield creation

`create_repo` defaults to `false`. When `true`, `target_repo` is created as a
private repository initialized with a README before opening the generated PR.
Generation and schema, placeholder and `USE_USER_ENV` checks run first, so a
failed build does not create a repository.

- With `X-GitHub-Token`: personal creation requires the PAT to belong to the
  destination owner; organization creation requires the PAT's organization
  permissions. The PAT also publishes the PR; no App installation is required.
- Without that header: organization creation uses the GitHub App with
  Administration write permission. Personal creation requires an Auth0 caller
  with a stored GitHub token. An agent API key alone cannot create personal
  repositories (`USER_REPO_CREATE_UNSUPPORTED`).
- Existing destinations fail with `409 REPO_EXISTS`; use `create_repo: false`.
- If publication or App verification fails after creation, the error includes
  `details.repoCreated`, `details.repoUrl` and recovery guidance. Fix access and
  retry with `create_repo: false`. Repositories are never deleted automatically.

## Existing repositories and PRs

Omit `create_repo` to scaffold into an existing repository. This is useful for
adding generated modules as well as starting a project. Generated paths can
overwrite matching paths in the PR, so review it before merging. The default
branch is not overwritten by generation.

Omit `branch`, `prNumber` and `prUrl` to create a new `scaffolder/...` branch
and PR (201). Set `prUrl` or `prNumber` to regenerate an existing open PR (200).
Set `branch` to reuse a named scaffolder branch; a matching open PR is reused,
or one is created. Prefix `scaffolder/` is added automatically. If multiple
target selectors are supplied, they must agree. Protected branches and PRs
from a different repository are rejected. Concurrent branch movement is not
force-pushed.

`draft` defaults to true. `draft: false` creates a ready-for-review PR.
`prTitle` and `prBody` customize its metadata. The existing schema payload
remains required.

## Curl examples

Use `request.json` for your existing schema payload. The examples add workflow
fields without repeating it. Set `API` to your deployed `/api/agent-scaffold` URL.

```bash
export API="https://YOUR_SCAFFOLDER_HOST/api/agent-scaffold"
export PROJECT_URL="https://github.com/judigot/scaffolder-files/tree/main/Projects/ORM%20Schema%20-%20Knex"

# Existing repo + bundled recipe, GitHub App publication.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  --json "$(jq '. + {project: "ORM Schema - Knex", target_repo: "judigot/existing-app"}' request.json)"

# Public recipe + public starter, existing destination.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  --json "$(jq --arg project "$PROJECT_URL" '. + {project_url: $project, template_repo: "https://github.com/judigot/template-monorepo", target_repo: "judigot/existing-app"}' request.json)"

# New organization repo using the App.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  --json "$(jq --arg project "$PROJECT_URL" '. + {project_url: $project, template_repo: "https://github.com/judigot/template-monorepo", target_repo: "YOUR_ORG/new-app", create_repo: true}' request.json)"

# New personal repo using a PAT. Use YOUR_ORG/new-app for PAT org creation.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  -H "X-GitHub-Token: $GITHUB_PAT" \
  --json "$(jq --arg project "$PROJECT_URL" '. + {project_url: $project, template_repo: "https://github.com/judigot/template-monorepo", target_repo: "judigot/new-app", create_repo: true}' request.json)"

# Update an existing PR with a PAT; omit the PAT header to use the App.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  -H "X-GitHub-Token: $GITHUB_PAT" \
  --json "$(jq --arg project "$PROJECT_URL" '. + {project_url: $project, target_repo: "judigot/new-app", prUrl: "https://github.com/judigot/new-app/pull/1"}' request.json)"

# Named branch, custom metadata, ready-for-review PR.
curl --fail-with-body "$API" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  --json "$(jq --arg project "$PROJECT_URL" '. + {project_url: $project, target_repo: "judigot/existing-app", branch: "refresh-models", draft: false, prTitle: "Refresh generated models", prBody: "Generated from the updated project inputs."}' request.json)"
```

For PR-number targeting replace `prUrl` with `prNumber: 1`. For a recipe's
own `$BASE` (remote or in-house), omit `template_repo`. For an explicit starter
version, use `https://github.com/owner/starter/tree/v1.0.0` in `template_repo`.
Auth0 callers can replace the bearer value with `$AUTH0_ACCESS_TOKEN`.

## Skill follow-up

The separate `judigot/ai` scaffolder skill should mirror these URL, PAT and
recovery conventions. This PR updates the host API and its usage documentation.
