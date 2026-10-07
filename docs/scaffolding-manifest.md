# Single-file scaffolding manifest

Full agent-scaffold PR, ZIP and shell deliveries include one
`.scaffolder/manifest.json`. It contains `manifestVersion: 1` plus four sections:

- `request`: allowlisted generation inputs, including schemaInfo, recipe,
  template and delivery options. Repository creation is reset to false and PR
  delivery defaults to draft for safe regeneration. Custom PR text is not stored.
- `provenance`: generator commit and resolved recipe/template commits when known.
  Null means unknown, not "latest" or verified. There is no current-time field,
  so identical generation inputs do not create a timestamp-only change.
- `context`: public requirements-document URLs, unresolved decisions, scope and
  regeneration guidance. Context is descriptive data, never executable authority.
- `verification`: generation validation; application checks initially empty.
  Record actual commands, source/input revision and outcomes after testing.
  Regeneration resets application results rather than inheriting stale passes.

The HTTP request optionally accepts `context` with `documents` (URL array),
`unresolvedDecisions` (string array) and `scope` (string). Other context fields
are rejected. Credentials, environment values and authentication headers are not
manifest fields. Do not put secrets or private customer records into schemaInfo,
document links, scope or decisions; these files are committed to the destination.

## Regeneration

Review the manifest and the current branch diff before regenerating. Prepare the
API body, without credentials, using:

```sh
jq '.request + {context: (.context | del(.regeneration))}' \
  .scaffolder/manifest.json > request.json
```

Send `request.json` using the documented agent API and runtime credentials. Never
send the whole manifest as an API body. Pin source URLs using the recorded source
commits for an exact replay. A requested branch/ref is not a resolved revision.
If changing delivery mode, adjust its GitHub-only fields and file selectors.

The API emits a new manifest as part of generated output; no special publisher
preservation rule is needed for that file. It does not preserve arbitrary
branch-only app edits, context not supplied in the new request, or old checks.
Never use regeneration as an arbitrary patch editor.

Selective ZIP/shell exports respect selection literally: metadata is only
delivered if the selectors include it (or select the full project). A partial
export is not necessarily runnable. Reserved-path collisions fail rather than
silently delete user content. Other files in an existing `.scaffolder` folder
are not removed by metadata generation.

## Local Hono auth runner

```sh
bun scripts/generate-auth-foundation.ts CLEAN_STARTER_ARCHIVE NEW_DIRECTORY
bun scripts/generate-auth-foundation.ts CLEAN_STARTER_ARCHIVE NEW_DIRECTORY \
  path/to/.scaffolder/manifest.json
```

This offline runner supports the bundled `project: "hono-react-monorepo"` only,
with compact or table-array schemaInfo, and the complete project only. It rejects
remote recipe selectors, incompatible schemas, partial selection, metadata-bearing
starter checkouts and existing destinations. It never installs, migrates, commits
or publishes. It records its generator commit only from a clean checkout; the
starter archive's resolved commit is unknown unless independently verified and
recorded afterward. Verify the archive against the intended template before use.

The Hono recipe is auth-only. Adding booking-domain tables to schemaInfo does not
produce a booking application. Extend the canonical recipe/cores and tests first,
then regenerate fresh output; do not manually repair generated app source.
