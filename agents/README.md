# Project-Specific Agents

See [@AGENTS.md](../AGENTS.md) for full documentation.

## Directory Structure

```
agents/
└── project-specific/
    ├── database-introspector.md
    ├── docker-environment.md
    ├── error-handling.md
    ├── health-check.md
    └── project-builder.md
```

## Adding New Agents

1. Add a `.md` file to `./project-specific/`
2. Include YAML frontmatter with `name`, `description`, `model`, `color`, `tools`
3. Agent will be auto-discovered by Claude Code via `--plugin-dir .`
