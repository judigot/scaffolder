# Scaffolder Project Instructions

## Project Overview

This is a **scaffolder** project containing AI agents for software development workflows. Agents are organized in `agents/project-specific/` for specialized functionality.

## IDE Compatibility

| Feature | Claude Code | Cursor IDE |
|---------|-------------|------------|
| Plugin discovery | `--plugin-dir` | `.cursor/rules/` |
| Project context | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` |
| Agent auto-invoke | ✅ Native | ❌ Manual `@` reference |

### Claude Code

```sh
claude --plugin-dir ~/ai --plugin-dir .
```

### Cursor IDE

- `AGENTS.md` is auto-discovered
- Reference agents with `@agents/project-specific/<agent>.md`

## Available Project-Specific Agents

| Agent | Purpose |
|-------|---------|
| `database-introspector` | Database schema analysis and documentation |
| `docker-environment` | Container configuration and deployment |
| `error-handling` | Error handling patterns and server configuration |
| `health-check` | Health monitoring and diagnostics |
| `project-builder` | Project scaffolding and code generation |

## Coding Standards

### TypeScript
- No `any` types — use `unknown` instead
- No `as` type assertions — use type guards and narrowing
- Explicit return types for exported functions
- Discriminated unions for complex state
- Wrap variables in `String()` when interpolating
- Handle `null`, `undefined`, `0`, or `NaN` explicitly

### React
- Function components only
- Include all dependencies in hooks
- Small components with logic extracted into hooks
- Proper `useEffect` usage (external system sync only)
- Minimal state, derived values preferred
- Accessibility is mandatory

### Linting Priority
1. ESLint (source of truth)
2. Oxlint
3. Biome

## Development Workflow

1. **Before changes**: Review relevant agent instructions
2. **During development**: Follow lint workflow (`oxlint → biome → lint`)
3. **After changes**: Run code review agent for PR analysis

## Commands

```sh
bun run lint        # Full linting (tsc + eslint)
bun run lint:oxlint # Run Oxlint
bun run lint:biome  # Run Biome
```

## Agent File Format

Agents use YAML frontmatter:

```markdown
---
name: agent-identifier
description: Use this agent when [conditions]
model: inherit
color: blue
tools: ["Read", "Write", "Bash", "Grep"]
---

[System prompt content]
```

## Repository Structure

```
scaffolder/
├── .claude-plugin/plugin.json   # Claude Code plugin manifest
├── .cursor/rules/               # Cursor IDE rules
├── agents/project-specific/     # Project-specific agents
├── AGENTS.md                    # This file (shared)
└── CLAUDE.md                    # References @AGENTS.md
```

## Notes for AI Assistants

- Check agent descriptions to understand when to invoke them
- Follow established patterns in existing agent files
- Do not modify linting configurations without explicit approval
- Testing work is owned by the Test Master agent
- Code review work is owned by the Code Reviewer agent
