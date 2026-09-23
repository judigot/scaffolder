# Agent scaffold output contract

This feature adds the `output` selector to `POST /api/agent-scaffold`.

- `github_pr` keeps the current draft pull request flow.
- `zip` returns the validated generated structure as a ZIP attachment.
- `sh` returns a POSIX shell script named `scaffold.sh`.

Every mode must use the existing deterministic validation and build path. Export modes must not mutate GitHub.

See the pull request description for the full acceptance contract and required verification.
