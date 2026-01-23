# Scaffolder Project Instructions

## Project Overview

This is a **scaffolder** project containing AI agents for software development workflows.

## IDE Setup

### Claude Code

Global settings from `~/ai` are automatically loaded via shell function:

```sh
claude   # Automatically uses --plugin-dir ~/ai
```

For project-specific agents, add the local plugin:

```sh
claude --plugin-dir ~/ai --plugin-dir .
```

### Cursor IDE

- Global rules: Maintained in `~/ai/settings/rules.md` (not duplicated here)
- Project agents: Reference with `@agents/<agent>.md`

## Available Agents

| Agent | Purpose |
|-------|---------|
| `ai-chat-schema-builder` | Conversational app schema generation and validation |
| `database-introspector` | Database schema analysis and documentation |
| `docker-environment` | Container configuration and deployment |
| `error-handling` | Error handling patterns and server configuration |
| `health-check` | Health monitoring and diagnostics |
| `project-builder` | Project scaffolding and code generation |

## Directory Structure

```
scaffolder/
├── .claude-plugin/
│   └── plugin.json           # Claude Code plugin manifest
├── .cursor/                  # Reusable template
│   └── rules/
│       ├── global-agents/
│       │   └── RULE.md       # References ~/ai (always applied)
│       └── project-agents/
│           └── RULE.md       # References agents/README.md
├── agents/                   # Project-specific agents
│   └── README.md             # Agent documentation
├── AGENTS.md                 # This file
└── CLAUDE.md                 # Entry point
```

## Global Resources

@~/ai/README.md

## Development Workflow

1. **Before changes**: Review relevant agent instructions
2. **During development**: Follow lint workflow (`oxlint → biome → lint`)
3. **After changes**: Use code-reviewer agent for PR analysis

## Commands

```sh
bun run lint        # Full linting (tsc + eslint)
bun run lint:oxlint # Run Oxlint
bun run lint:biome  # Run Biome
```

## Notes for AI Assistants

- Check agent descriptions to understand when to invoke them
- Follow coding standards from `~/ai/settings/rules.md`
- Do not modify linting configurations without explicit approval
