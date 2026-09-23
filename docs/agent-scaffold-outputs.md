# Agent scaffold output selection

`POST /api/agent-scaffold` accepts `output: "github_pr" | "zip" | "sh"`.
Omitting `output` preserves the existing `github_pr` behavior.

All modes authenticate to Scaffolder, validate `schemaInfo`, resolve pinned
project/template sources, run the deterministic builder, reject build errors,
leftover placeholders and `USE_USER_ENV`, then create one validated file
manifest. Delivery happens only after that stage succeeds.

## Authentication

```sh
export SCAFFOLDER_URL='https://your-scaffolder.example'
export SCAFFOLDER_AGENT_API_KEY='...'
```

`zip` and `sh` need only the Scaffolder credential. They do not require
`target_repo`, a GitHub App installation, or `X-GitHub-Token`, and they never
create repositories or pull requests.

## GitHub pull request output

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "project":"hono-react",
    "target_repo":"judigot/example",
    "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
  }' \
  "$SCAFFOLDER_URL/api/agent-scaffold"
```

For PAT publication, add `X-GitHub-Token` exactly as before. Existing repository
creation, targeted PR updates, draft behavior and provenance metadata remain JSON
responses.

## ZIP output

```sh
tmp=$(mktemp)
status=$(
  curl -sS -o "$tmp" -w '%{http_code}' \
    -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "output":"zip",
      "project":"hono-react",
      "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
    }' \
    "$SCAFFOLDER_URL/api/agent-scaffold"
)
case "$status" in
  2??) mv "$tmp" scaffold.zip ;;
  *) cat "$tmp" >&2; rm -f "$tmp"; exit 1 ;;
esac
```

Successful ZIP responses use `application/zip` and filename `scaffold.zip`.

### Select files in a ZIP

```sh
tmp=$(mktemp)
status=$(
  curl -sS -o "$tmp" -w '%{http_code}' \
    -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "output":"zip",
      "files":["src/**","README.md"],
      "project":"hono-react",
      "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
    }' \
    "$SCAFFOLDER_URL/api/agent-scaffold"
)
case "$status" in
  2??) mv "$tmp" selected.zip ;;
  *) cat "$tmp" >&2; rm -f "$tmp"; exit 1 ;;
esac
```

## Self-contained shell output

```sh
tmp=$(mktemp)
status=$(
  curl -sS -o "$tmp" -w '%{http_code}' \
    -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "output":"sh",
      "project":"hono-react",
      "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
    }' \
    "$SCAFFOLDER_URL/api/agent-scaffold"
)
case "$status" in
  2??) mv "$tmp" scaffold.sh; chmod +x scaffold.sh ;;
  *) cat "$tmp" >&2; rm -f "$tmp"; exit 1 ;;
esac

sh scaffold.sh './my-app'
```

### Select files in a shell export

```sh
tmp=$(mktemp)
status=$(
  curl -sS -o "$tmp" -w '%{http_code}' \
    -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "output":"sh",
      "files":["api/**","README.md"],
      "project":"hono-react",
      "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
    }' \
    "$SCAFFOLDER_URL/api/agent-scaffold"
)
case "$status" in
  2??) mv "$tmp" scaffold.sh; chmod +x scaffold.sh ;;
  *) cat "$tmp" >&2; rm -f "$tmp"; exit 1 ;;
esac

sh scaffold.sh './selected-app'
```

The script embeds the validated project as ZIP data. It performs no network
request and does not install dependencies, initialize Git, run migrations, or
deploy. It accepts exactly one destination, refuses symlink and nonempty
destinations, extracts in a temporary staging directory, and moves the complete
project into place only after extraction succeeds.

### Platform prerequisites

Supported targets are POSIX `sh` environments on Linux and macOS with:

- `base64` supporting GNU `-d` or BSD/macOS `-D`;
- `unzip`;
- `mktemp`, `dirname`, `mv`, `rm`, and `rmdir`.

## File selection

The optional `files` field is supported only for `zip` and `sh` outputs.

- Omit `files`, or use `"files":["*"]`, to export the entire generated project.
- Exact paths select exact files, for example `"files":["package.json","src/main.tsx"]`.
- `*` matches within one path segment, for example `src/*.tsx`.
- A trailing `/**` recursively selects a directory and all descendants, for example `src/**` or `public/**`.
- Matching is case-sensitive. Dotfiles are matched normally, including by recursive patterns.
- Selectors must be project-relative and may not contain traversal, absolute/drive paths, backslashes, `?`, character classes, braces, extglobs, negation, or a non-trailing `**`.
- Every selector must match at least one generated file or directory. An unmatched selector returns a non-2xx error naming that selector.
- Overlapping selectors are deduplicated. Required parent directories and explicitly selected empty directories are retained.
- Selection does not add dependencies or related files automatically. A partial export may not build or run independently.

Scaffolder always generates and validates the complete project before applying
selection. Errors in files that would later be excluded still fail the request.
Selection never changes the generated source project and never performs GitHub
mutations.

## Validation and limits

Paths must be repository-relative and may not contain traversal segments,
absolute/drive paths, NULs, duplicate normalized paths, or file/directory
collisions. Binary assets, empty files, dotfiles and empty directories are
preserved. Executable mode `0755` is retained when present in generated
metadata; otherwise files default to `0644`.

Exports are limited to 10,000 files and 25 MiB of uncompressed file content.
Failures return non-2xx JSON.

GitHub-only fields are rejected for `zip` and `sh`: `target_repo`,
`create_repo`, `branch`, `prTitle`, `prBody`, `draft`, `prNumber`,
and `prUrl`.
