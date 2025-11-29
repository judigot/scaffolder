---
id: ai-agent-orchestration-spec
type: guide
domain: generic
status: stable
version: 1.0.0
---

# AI Agent Orchestration Specification

## Purpose

Define a standard set of AI roles (sub-agents) and how they consume specs from `/spec-driven-development`. This provides a multi-agent workflow for AI-driven development.

## When to use

Reference this document when:
- Implementing AI-assisted development workflows
- Configuring AI agents or AI IDEs
- Understanding the spec-driven development pipeline
- Coordinating multiple AI agents on a feature

## Required sections

This guide covers:
- Sub-agent roles and responsibilities
- Agent inputs and outputs
- Orchestration workflow
- Completion criteria

---

## Core Principle

**All AI agents and AI IDEs must treat `/spec-driven-development` as the primary source of truth.**

Every agent must:
1. Read relevant spec(s) before taking action
2. Reference which spec file(s) it used
3. Track which sections or checklist items are satisfied
4. Produce outputs aligned with spec requirements

---

## Sub-Agent Roles

### 1. Spec Agent

**Purpose:** Understand requirements and decompose specs into actionable tasks.

**Input:**
- Feature/API/UI specs from `/spec-driven-development`
- Project-specific spec instances
- Change request or feature description

**Output:**
- Structured task list derived from spec
- Explicit clarifications or assumptions
- Mapping of spec sections → tasks

**Responsibilities:**
- Parse and understand spec documents
- Identify all acceptance criteria
- Extract edge cases and non-functional requirements
- Decompose into implementable tasks
- Flag ambiguities or missing information
- Prioritize tasks by dependency

**Process:**

```
1. Read spec document completely
2. Extract all requirements:
   - User stories → tasks
   - Acceptance criteria → subtasks
   - Edge cases → test tasks
   - NFRs → validation tasks
3. Identify dependencies between tasks
4. Create ordered task list
5. Document assumptions made
6. Output task breakdown
```

**Output Format:**

```typescript
interface SpecAgentOutput {
  specFile: string;
  specId: string;
  specVersion: string;
  tasks: Task[];
  assumptions: string[];
  clarificationsNeeded: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  specSection: string;
  type: "implementation" | "test" | "documentation" | "validation";
  dependencies: string[];
  acceptanceCriteria: string[];
  priority: "high" | "medium" | "low";
}
```

---

### 2. Implementation Agent

**Purpose:** Generate code that implements spec requirements.

**Input:**
- Tasks from Spec Agent
- Existing codebase context
- Project coding standards
- Relevant spec sections

**Output:**
- Code changes implementing tasks
- Notes on which spec parts are covered
- List of files created/modified

**Responsibilities:**
- Implement features exactly as described in spec
- Follow project coding standards and patterns
- Maintain consistency with existing codebase
- Track implementation against spec requirements
- Request clarification when spec is ambiguous

**Process:**

```
1. Review task from Spec Agent
2. Locate relevant spec sections
3. Analyze existing codebase patterns
4. Generate implementation:
   - Follow spec exactly
   - Match project conventions
   - Include inline documentation
5. Track which acceptance criteria are addressed
6. Output code changes with spec mapping
```

**Output Format:**

```typescript
interface ImplementationAgentOutput {
  taskId: string;
  specSectionsCovered: string[];
  filesModified: FileChange[];
  acceptanceCriteriaMet: string[];
  notes: string[];
}

interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
  description: string;
}
```

---

### 3. Test Agent

**Purpose:** Generate tests that verify spec requirements.

**Input:**
- Specs from `/spec-driven-development`
- Implementation diff from Implementation Agent
- Testing strategy from `testing-strategy-spec.md`

**Output:**
- Tests mapped to user stories and edge cases
- Tests for API contracts
- Test coverage report

**Responsibilities:**
- Ensure every spec element has corresponding tests
- Follow testing strategy guidelines
- Map tests explicitly to spec sections
- Maintain test quality and independence
- Verify edge cases and error scenarios

**Process:**

```
1. Read spec and identify testable elements:
   - User stories
   - Acceptance criteria
   - Edge cases
   - API contracts
   - Non-functional requirements
2. Review testing-strategy-spec.md for guidelines
3. Generate tests for each element:
   - Unit tests for logic
   - Integration tests for flows
   - Contract tests for APIs
4. Map each test to spec section
5. Verify coverage meets minimums
6. Output tests with spec mapping
```

**Output Format:**

```typescript
interface TestAgentOutput {
  specFile: string;
  testsGenerated: TestMapping[];
  coverageReport: {
    userStories: number;
    edgeCases: number;
    apiContracts: number;
    overall: number;
  };
}

interface TestMapping {
  testFile: string;
  testName: string;
  specSection: string;
  specElement: string;
  testType: "unit" | "integration" | "e2e" | "contract";
}
```

---

### 4. Review / Refactor Agent

**Purpose:** Ensure quality, consistency, and compliance.

**Input:**
- Spec documents
- Implementation from Implementation Agent
- Tests from Test Agent
- Non-functional requirements from `non-functional-spec.md`

**Output:**
- Review comments
- Refactor suggestions
- Quality assessment

**Responsibilities:**
- Enforce code quality standards
- Verify spec compliance
- Check non-functional requirements
- Identify security concerns
- Suggest performance improvements
- Ensure consistency across codebase

**Process:**

```
1. Review implementation against spec
2. Check non-functional requirements:
   - Performance considerations
   - Security best practices
   - Observability requirements
   - Scalability patterns
3. Analyze code quality:
   - Naming conventions
   - Error handling
   - Code organization
4. Review test coverage
5. Generate feedback:
   - Must-fix issues
   - Suggestions
   - Improvements
6. Output review report
```

**Output Format:**

```typescript
interface ReviewAgentOutput {
  specCompliance: {
    compliant: boolean;
    missingRequirements: string[];
    deviations: string[];
  };
  qualityIssues: Issue[];
  securityConcerns: Issue[];
  performanceSuggestions: string[];
  refactorRecommendations: string[];
}

interface Issue {
  severity: "error" | "warning" | "info";
  location: string;
  message: string;
  specReference?: string;
}
```

---

### 5. Docs Agent

**Purpose:** Keep documentation aligned with implementation.

**Input:**
- Spec documents
- Implementation from Implementation Agent
- Tests from Test Agent

**Output:**
- Updated README sections
- API documentation
- Usage examples
- Architecture Decision Records (ADRs)

**Responsibilities:**
- Maintain accurate documentation
- Generate API reference docs
- Create usage examples
- Document architectural decisions
- Keep docs in sync with code

**Process:**

```
1. Review spec and implementation
2. Identify documentation needs:
   - New features → README updates
   - New APIs → API docs
   - Architecture changes → ADRs
3. Generate documentation:
   - Clear, concise language
   - Code examples
   - Configuration details
4. Ensure consistency with spec
5. Output documentation changes
```

**Output Format:**

```typescript
interface DocsAgentOutput {
  documentsUpdated: DocumentChange[];
  specSectionsCovered: string[];
}

interface DocumentChange {
  path: string;
  action: "create" | "update";
  description: string;
  sections: string[];
}
```

---

### 6. Orchestrator Agent

**Purpose:** Coordinate the multi-agent workflow.

**Input:**
- Feature request or change description
- Relevant specs from `/spec-driven-development`

**Behavior:**

```
1. Parse feature request
2. Identify relevant spec(s)
3. Invoke agents in sequence:
   
   Spec Agent
      ↓
   Implementation Agent
      ↓
   Test Agent
      ↓
   Review Agent
      ↓
   Docs Agent

4. Track progress:
   - Which spec items are satisfied
   - Which are pending
   - Which need clarification
5. Handle failures:
   - Retry with clarification
   - Escalate if blocked
6. Report completion status
```

**Orchestration Rules:**

| Step | Agent | Precondition | Success Criteria |
|------|-------|--------------|------------------|
| 1 | Spec Agent | Feature request received | Tasks decomposed, no blockers |
| 2 | Implementation Agent | Tasks available | Code generated, compiles |
| 3 | Test Agent | Implementation complete | Tests generated, pass |
| 4 | Review Agent | Tests passing | No blocking issues |
| 5 | Docs Agent | Review approved | Docs updated |

---

## Workflow States

```
┌────────────────┐
│    PENDING     │ Feature request received
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   SPEC_PHASE   │ Spec Agent decomposing
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ IMPLEMENTATION │ Implementation Agent coding
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    TESTING     │ Test Agent generating tests
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    REVIEW      │ Review Agent checking
└───────┬────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
┌──────┐  ┌──────────┐
│ DOCS │  │ REVISING │ Back to implementation
└──┬───┘  └──────────┘
   │
   ▼
┌────────────────┐
│   COMPLETE     │ All criteria satisfied
└────────────────┘
```

---

## Completion Criteria

A feature is NOT considered "Done" until:

### Spec Agent
- [ ] All requirements decomposed into tasks
- [ ] No unresolved ambiguities
- [ ] Dependencies identified

### Implementation Agent
- [ ] All tasks implemented
- [ ] Code compiles without errors
- [ ] Follows project conventions

### Test Agent
- [ ] Tests exist for each user story
- [ ] Tests exist for each edge case
- [ ] Tests exist for each API contract
- [ ] All tests pass
- [ ] Coverage meets minimums

### Review Agent
- [ ] No blocking issues
- [ ] Security concerns addressed
- [ ] Performance acceptable
- [ ] Non-functional requirements met

### Docs Agent
- [ ] Documentation updated
- [ ] API docs accurate
- [ ] Examples provided

---

## Agent Communication Protocol

Each agent must include in its output:

```typescript
interface AgentOutput {
  agentId: string;
  agentType: "spec" | "implementation" | "test" | "review" | "docs";
  timestamp: string;
  specFiles: string[];
  specSections: string[];
  checklistItemsSatisfied: string[];
  checklistItemsPending: string[];
  blockers: string[];
  nextAgentSuggestion?: string;
}
```

---

## Error Handling

| Error | Agent | Resolution |
|-------|-------|------------|
| Ambiguous spec | Spec Agent | Request clarification, document assumption |
| Missing dependency | Implementation Agent | Flag blocker, proceed with mock |
| Test failure | Test Agent | Report failure, suggest fix |
| Quality issue | Review Agent | Return to Implementation Agent |
| Missing docs | Docs Agent | Generate from spec + code |

---

## Integration with AI IDEs

When using AI IDEs (e.g., Cursor):

1. **Start with spec**: Open relevant spec file first
2. **Reference specs in prompts**: "Implement the login feature per `/spec-driven-development/features/auth-spec.md`"
3. **Request spec compliance**: "Verify this implementation matches the spec"
4. **Generate tests from spec**: "Create tests for all acceptance criteria in the spec"

---

## Checklist for AI Agents

Before processing any feature:

- [ ] Locate relevant spec(s) in `/spec-driven-development`
- [ ] Read spec completely
- [ ] Identify role (Spec/Implementation/Test/Review/Docs)
- [ ] Understand expected inputs and outputs
- [ ] Know completion criteria

During processing:

- [ ] Reference spec sections explicitly
- [ ] Track checklist items satisfied
- [ ] Document assumptions
- [ ] Flag blockers immediately
- [ ] Communicate with other agents via protocol

After processing:

- [ ] Output includes all required fields
- [ ] Spec sections covered are documented
- [ ] Pending items clearly identified
- [ ] Ready for next agent in pipeline

