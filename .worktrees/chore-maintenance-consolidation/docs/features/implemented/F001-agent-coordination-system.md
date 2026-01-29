# Feature: Agent Coordination System

**Feature ID**: F001  
**Status**: ✅ Production  
**Created**: 2026-01-29  
**Last Modified**: 2026-01-29  
**Owner**: maintenance-coordinator agent

---

## Quick Summary (50-100 tokens)

File-based coordination protocol enabling multiple AI agents to work in parallel worktrees without conflicts. Uses ~/conversation/ directory with board.yaml (task state), context.md (stable context), and conversation.log (turn-based dialogue) to coordinate work, track dependencies, and ensure zero file overlap between agents.

---

## 📂 Complete File Map

### Coordination Files

```
~/conversation/
├── board.yaml (100 lines)
│   ├── Purpose: Canonical task board with dependencies
│   ├── Structure: tasks[], coordination, merge_order
│   └── Fields: id, title, owner, status, dependencies, acceptance
│
├── context.md (50 lines)
│   ├── Purpose: Stable context, constraints, decisions
│   └── Sections: Goal, Problem, Solution, Current State, Constraints
│
├── conversation.log (600+ lines)
│   ├── Purpose: Append-only dialogue between agents
│   ├── Format: [timestamp agent_x] message\nNEXT: agent_y
│   └── Rule: Short turns, one action per turn
│
└── wait_for_turn.sh
    ├── Purpose: Polling script for turn detection
    └── Usage: wait_for_turn.sh agent_b

```

### Worktree Context Files

```
.worktrees/<branch-slug>/.agent-task-context/
├── BRANCH_NAME (committed)
│   └── Contains: Git branch name
│
├── Context.md (committed)
│   └── Contains: Goal, scope, steps, acceptance
│
└── .state/ (gitignored)
    ├── TASK_STATUS.{unclaimed,claimed,doing,done}
    └── TASK_OWNER.<agent-id>
```

---

## How It Works

### Turn-Based Protocol

1. Agent checks `grep "^NEXT:" ~/conversation/conversation.log | tail -1`
2. If turn matches agent name, agent:
   - Updates board.yaml (task status changes)
   - Appends ONE message to conversation.log
   - Ends with `NEXT: other_agent`
3. Agent loops waiting for next turn

### Task States

```yaml
- todo: Not started
- doing: In progress
- blocked: Waiting on dependency
- done: Completed
```

### Dependencies

Tasks reference other task IDs:

```yaml
dependencies: [T001, T002]
```

Agents cannot start task until dependencies are `done`.

---

## Integration Points

- **Worktree isolation**: Each agent works in separate `.worktrees/<branch-slug>/` directory
- **File conflict avoidance**: Tasks specify exact file scopes in Context.md
- **Merge coordination**: board.yaml defines merge_order (sequential integration)

---

## Git References

**Initial Implementation**: This coordination session (2026-01-29)

**Key conversations**:

- ~/conversation.txt (legacy, before migration to ~/conversation/)
- ~/conversation/conversation.log (current)

---

## Usage Examples

### Agent checks turn

```bash
grep "^NEXT:" ~/conversation/conversation.log | tail -1
# Output: NEXT: agent_b
```

### Agent updates board

```yaml
# Change status
- id: T003
  status: doing # was: todo
```

### Agent takes turn

```bash
cat >> ~/conversation/conversation.log << 'EOF'

[2026-01-29 23:45 agent_b]
T003 progress: Documented F001.

NEXT: agent_a

EOF
```

---

## Configuration

### Board Structure

```yaml
tasks:
  - id: T001
    title: 'Task description'
    owner: agent_a
    status: done
    dependencies: []
    acceptance:
      - Criterion 1
      - Criterion 2
```

### Context Structure

```markdown
## Goal

One-sentence objective

## Constraints

- File scope limits
- Blockers

## Decisions

- timestamp: Decision made
```

---

## Testing

1. Create ~/conversation/ directory
2. Initialize board.yaml, context.md, conversation.log
3. Run two agent sessions with wait_for_turn.sh
4. Verify turn-based exchanges in conversation.log
5. Confirm task status updates in board.yaml

---

## Performance

- Turn latency: ~2 seconds (polling interval)
- No race conditions (turn-based serialization)
- Scales to N agents (each polls for own name)

---

## Known Issues

None identified. First production use.

---

## Future Enhancements

- WebSocket-based turns (eliminate polling)
- Parallel task execution (when dependencies allow)
- Auto-merge when all tasks done
