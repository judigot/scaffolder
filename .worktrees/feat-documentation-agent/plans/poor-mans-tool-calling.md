# Plan: Poor Man's Tool Calling

## Goal

Implement a "tool calling" system for the AI chat without native function calling support. The AI outputs structured tags that the app parses and executes.

## Tag Format

```
<@@TOOL:tool_name@@>{"param": "value"}</@@TOOL>
```

---

## Comprehensive Tool List (Based on Claude Code, OpenCode, Cursor)

### Tier 1: Core File Operations (Must-Have)

These are the absolute minimum to feel like a coding agent.

| Tool    | Params                                            | Description                                          | Reference             |
| ------- | ------------------------------------------------- | ---------------------------------------------------- | --------------------- |
| `read`  | `file_path, offset?, limit?`                      | Read file contents with optional line range          | Claude Code, OpenCode |
| `write` | `file_path, content`                              | Write/create file (atomic, preserve newlines)        | Claude Code, OpenCode |
| `edit`  | `file_path, old_string, new_string, replace_all?` | String replacement editing (safer than full rewrite) | Claude Code           |
| `glob`  | `pattern, path?`                                  | Find files by glob pattern                           | Claude Code, OpenCode |
| `grep`  | `pattern, path?, include?, exclude?`              | Search file contents with regex                      | Claude Code, OpenCode |
| `ls`    | `path, depth?, ignore?`                           | List directory contents                              | OpenCode              |

### Tier 2: Command Execution (Essential for Agentic Behavior)

| Tool   | Params                    | Description                        | Reference             |
| ------ | ------------------------- | ---------------------------------- | --------------------- |
| `bash` | `command, cwd?, timeout?` | Execute shell commands (sandboxed) | Claude Code, OpenCode |

**Guardrails:**

- Allowlist commands or executables
- Hard resource limits (CPU/mem/time)
- Disable network by default (or explicit "net on" mode)
- Capture stdout/stderr/exit code

### Tier 3: Git Operations (Critical for Coding Workflows)

| Tool           | Params          | Description                           | Reference   |
| -------------- | --------------- | ------------------------------------- | ----------- |
| `git_status`   | `{}`            | Get `git status --porcelain`          | Claude Code |
| `git_diff`     | `staged?`       | Get `git diff` or `git diff --staged` | Claude Code |
| `git_log`      | `limit?, file?` | View commit history                   | Claude Code |
| `git_commit`   | `message`       | Stage all and commit                  | Claude Code |
| `git_checkout` | `branch`        | Switch branches                       | Custom      |
| `git_add`      | `files`         | Stage specific files                  | Custom      |

### Tier 4: Code Intelligence (LSP-like)

| Tool               | Params                    | Description                   | Reference |
| ------------------ | ------------------------- | ----------------------------- | --------- |
| `diagnostics`      | `file_path?`              | Get typecheck/lint errors     | OpenCode  |
| `go_to_definition` | `file_path, line, column` | Find symbol definition        | Cursor    |
| `find_references`  | `file_path, line, column` | Find all references to symbol | Cursor    |
| `hover`            | `file_path, line, column` | Get type/doc info at position | Cursor    |

### Tier 5: Verification Loop (What Makes Agents Reliable)

| Tool        | Params            | Description                          | Reference |
| ----------- | ----------------- | ------------------------------------ | --------- |
| `lint`      | `file_path?`      | Run linter, return structured errors | OpenCode  |
| `typecheck` | `file_path?`      | Run TypeScript/type checker          | OpenCode  |
| `test`      | `file?, pattern?` | Run tests, return results            | OpenCode  |
| `build`     | `{}`              | Run build, return success/errors     | Custom    |

### Tier 6: Scaffolder-Specific Tools

| Tool                         | Params                                            | Description                                                        |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `get_app_state`              | `keys: string[]`                                  | Returns small, safe slices of Zustand (never the whole store)      |
| `list_projects`              | `{}`                                              | Returns available projects: `[{name, uniqueId}]`                   |
| `get_selected_project`       | `{}`                                              | Returns `{name, uniqueId, projectPath}`                            |
| `get_project_structure_hash` | `projectName`                                     | Returns deterministic fingerprint to detect stale context          |
| `validate_schema`            | `schemaInfo`                                      | Runs ISchemaInfo + invariant validation; returns structured errors |
| `build_project`              | `projectName, schemaInfo, decryptedUserMetadata?` | Runs buildProjectFiles; returns structure or reference id          |
| `get_build_artifact`         | `artifactId, type, path, depth`                   | Fetch slices of large build outputs on demand                      |
| `invalidate_cache`           | `projectName`                                     | Clears project build cache to force rebuild                        |

### Tier 7: Session & Context Management

| Tool      | Params           | Description                                          | Reference             |
| --------- | ---------------- | ---------------------------------------------------- | --------------------- |
| `task`    | `prompt, agent?` | Run sub-task with AI agent                           | Claude Code, OpenCode |
| `history` | `limit?`         | Returns recent applied patches/commands for rollback | Custom                |
| `compact` | `{}`             | Summarize conversation to reduce context             | OpenCode              |

### Tier 8: Web & External (Optional)

| Tool          | Params                   | Description                     | Reference |
| ------------- | ------------------------ | ------------------------------- | --------- |
| `fetch`       | `url, format?, timeout?` | Fetch URL content               | OpenCode  |
| `sourcegraph` | `query, count?`          | Search code across public repos | OpenCode  |

---

## Implementation Priority

### Phase 1: Minimum Viable Agent (7 tools)

1. `read` - Read files
2. `write` - Write files
3. `edit` - Edit files (string replacement)
4. `glob` - Find files
5. `grep` - Search content
6. `bash` - Run commands (sandboxed)
7. `git_status` + `git_diff` - See changes

### Phase 2: Verification Loop (4 tools)

8. `diagnostics` - Get errors
9. `lint` - Run linter
10. `typecheck` - Run type checker
11. `test` - Run tests

### Phase 3: Scaffolder Integration (6 tools)

12. `get_app_state` - Read Zustand slices
13. `list_projects` / `get_selected_project`
14. `validate_schema`
15. `build_project`
16. `invalidate_cache`

### Phase 4: Advanced (5+ tools)

17. `task` - Sub-agents
18. `git_commit` / `git_add`
19. LSP tools (definition, references, hover)
20. `fetch` - Web content
21. `history` - Rollback support

---

## Architecture

### Parser

```typescript
// Parse AI output for tool calls
const TOOL_REGEX = /<@@TOOL:(\w+)@@>([\s\S]*?)<\/@@TOOL>/g;

function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let match;
  while ((match = TOOL_REGEX.exec(text)) !== null) {
    calls.push({
      name: match[1],
      params: JSON.parse(match[2]),
    });
  }
  return calls;
}
```

### Tool Registry

```typescript
const tools: Record<string, Tool> = {
  read: { schema: z.object({...}), execute: async (params) => {...} },
  write: { schema: z.object({...}), execute: async (params) => {...} },
  // ...
};
```

### Execution Loop

1. AI generates response with tool calls
2. Parser extracts `<@@TOOL:...@@>` tags
3. Validate params with Zod
4. Execute tool (with permissions check)
5. Return result to AI
6. AI continues or completes

### Safety

- All tools operate on validated inputs
- No `eval` or arbitrary code execution
- Tools are an allowlist, not arbitrary function calls
- Results are structured JSON
- Workspace jail (can't access outside project)
- Command allowlist for `bash`

---

## Reference

- Claude Code CLI: https://docs.anthropic.com/en/docs/claude-code/cli-reference
- OpenCode: https://github.com/opencode-ai/opencode
- Original spec: https://petalite-parent-84e.notion.site/Prompt-2f64e6c9b7dd80eb947fdd96217b4e51
