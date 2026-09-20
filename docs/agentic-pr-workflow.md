# Agentic PR workflow

This repository optimizes pull requests for parallel agent implementation.

## Contract

Every PR must keep the machine-readable block from the pull request template:

```text
<!-- agent-pr
depends_on: none
stacked_on: main
touch_set: src/example/,files/Projects/hono-react/
-->
```

- `depends_on`: comma-separated PR numbers such as `#123,#124`, or `none`.
- `stacked_on`: `main` or the immediate prerequisite PR, such as `#123`.
- `touch_set`: comma-separated repository path prefixes owned by this PR. Do not use globs.

The PR CI verifies that every changed file is covered by the declared touch set.

## Parallel work

Independent PRs should have non-overlapping touch sets. CI rejects overlapping open PRs unless one declares a dependency on the other.

When a PR depends on another open PR, stack it on the prerequisite branch:

```text
PR #101 foundation
        ↓
PR #102 API
        ↓
PR #103 UI
```

For PR #102:

```text
depends_on: #101
stacked_on: #101
```

For PR #103:

```text
depends_on: #102
stacked_on: #102
```

Once a prerequisite merges, retarget the dependent PR toward `main` and update `stacked_on`.

## CI behavior

PR CI cancels stale runs for the same PR and runs independent jobs in parallel.

The stable merge-readiness signal is:

```text
PR CI / PR Gate
```

The gate includes:

- PR ownership/dependency contract
- path-selected lint
- path-selected Bun tests
- path-selected Vitest
- API hello checks when API surfaces change
- targeted Golden Framework testing only when a PR directly changes a golden project surface

Full Playwright and full Golden Framework regression remain on `main` so ordinary feature PRs are not blocked by the slowest suites.
