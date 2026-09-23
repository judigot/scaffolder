# Agent scaffold output selection

`POST /api/agent-scaffold` accepts `output: "github_pr" | "zip" | "sh"`.
Omitting `output` preserves the existing `github_pr` behavior. ZIP and shell
outputs also accept optional `files: string[]` selectors. Omitting `files`
delivers the complete generated project.

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

### Selective ZIP output

The full project is still generated and validated first. This example downloads
the complete frontend source plus the root README:

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
  2??) mv "$tmp" scaffold.zip ;;
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

### Selective shell output

```sh
tmp=$(mktemp)
status=$(
  curl -sS -o "$tmp" -w '%{http_code}' \
    -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "output":"sh",
      "files":["api/**","api-test.sh"],
      "project":"hono-react",
      "schemaInfo":"<@@SCHEMA@@>\n@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D|>session\n@session:id:s#pk,userId:u>user,expiresAt:D|<user\n<@@/SCHEMA@@>"
    }' \
    "$SCAFFOLDER_URL/api/agent-scaffold"
)
case "$status" in
  2??) mv "$tmp" scaffold.sh; chmod +x scaffold.sh ;;
  *) cat "$tmp" >&2; rm -f "$tmp"; exit 1 ;;
esac

sh scaffold.sh './api-only'
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

Selection is available only for `output: "zip"` and `output: "sh"`.
`github_pr` rejects the `files` field.

- Omit `files`, or send `"files":["*"]`, for the entire project.
- Exact paths select exact files, for example `"package.json"` or
  `"src/main.tsx"`.
- `*` matches within one path segment.
- A trailing `/**` selects a directory and every descendant, for example
  `"src/**"`. Recursive patterns include dotfiles.
- Matching is case-sensitive and paths always use `/`.
- Overlapping selectors are combined and deduplicated.
- Every selector must match at least one generated file or directory.
  `UNMATCHED_FILE_SELECTOR` returns the offending selector in
  `details.selector`.
- Empty arrays, blank selectors, absolute paths, traversal, backslash
  separators, `?`, character classes, brace expansion, negation, extglobs,
  and non-trailing `**` are rejected as `INVALID_FILE_SELECTOR`.
- Parent directories required by selected files are retained. Recursive
  selection also preserves matching empty directories.

Selection happens only after the complete project has passed schema filters,
generation, placeholder/`USE_USER_ENV`, path-safety and export-limit checks.
Files that are excluded from the delivered artifact can therefore still make
the request fail validation.

Partial exports do not automatically include imports, dependencies,
configuration or related files. A selected subset may not build or run by
itself.

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

The `files` field is rejected for `github_pr` output.
