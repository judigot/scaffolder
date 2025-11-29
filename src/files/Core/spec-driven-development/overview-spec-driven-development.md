---
id: overview-spec-driven-development
type: guide
domain: generic
status: stable
version: 1.0.0
---

# Spec-Driven Development Overview

## Purpose

Define the guiding principles for spec-driven, AI-assisted development. This document establishes how specifications serve as the single source of truth for all code, tests, API contracts, and documentation.

## When to use

Read this document before starting any new feature, project, or significant change. All AI agents, AI IDEs (e.g., Cursor), and human developers must follow these principles.

## Required sections

This overview covers:
- Core principles
- AI-driven workflow
- Standards and conventions
- Integration expectations

## Core Principles

### 1. Spec as Single Source of Truth

All implementation artifacts trace back to specifications in `/spec-driven-development`:

- **Code** implements behavior described in specs
- **Tests** verify requirements defined in specs
- **API contracts** match schemas defined in specs
- **Documentation** reflects current spec state

### 2. No Feature Without a Spec

Every new feature or significant change must start from a specification document:

- Create a new spec file using the appropriate template
- Update existing specs when modifying behavior
- Reference spec IDs in commits and pull requests

### 3. AI-Driven Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPEC-DRIVEN WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: SPEC CREATION                                          │
│  ├── Write or update spec in /spec-driven-development           │
│  ├── Define acceptance criteria                                 │
│  └── Include test requirements                                  │
│                                                                 │
│  Step 2: AI PROCESSING                                          │
│  ├── AI agents read spec(s)                                     │
│  ├── Generate implementation plan                               │
│  └── Produce code, tests, and docs                              │
│                                                                 │
│  Step 3: VERIFICATION                                           │
│  ├── Run all tests                                              │
│  ├── Execute linters and static analysis                        │
│  └── Validate against spec requirements                         │
│                                                                 │
│  Step 4: ITERATION                                              │
│  ├── Update spec if requirements change                         │
│  ├── Regenerate affected artifacts                              │
│  └── Repeat until Definition of Done satisfied                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Standards-First Approach

Embed and encourage industry standards:

| Domain | Standard |
|--------|----------|
| API Contracts | OpenAPI 3.x / JSON Schema |
| Behavior Specs | BDD-style Given/When/Then |
| Service Design | 12-Factor App Principles |
| Type Definitions | TypeScript-style annotations |
| Testing | Arrange-Act-Assert pattern |

### 5. Framework-Agnostic, Web-Aware

- Examples use TypeScript/JavaScript pseudo-code
- No hard-coded framework dependencies in core specs
- Patterns applicable to any web stack
- Specific framework guidance belongs in project-level specs

## Specification Types

| Spec Type | File | Purpose |
|-----------|------|---------|
| Feature | `feature-spec-template.md` | User-facing functionality |
| API | `api-spec-template.md` | Backend endpoints and contracts |
| UI | `frontend-ui-spec-template.md` | Frontend screens and components |
| Testing | `testing-strategy-spec.md` | Test derivation and coverage |
| Non-Functional | `non-functional-spec.md` | Performance, security, reliability |
| AI Orchestration | `ai-agent-orchestration-spec.md` | Multi-agent workflow coordination |

## AI Agent Contract

All AI agents and AI IDEs working in this repository must:

1. **Read specs first** before generating any code
2. **Reference spec sections** when explaining implementation choices
3. **Generate tests** for every implemented feature
4. **Update specs** when behavior changes
5. **Follow checklists** in each spec template

## Definition of Done

A feature is complete when:

- [ ] Spec document exists and is current
- [ ] All acceptance criteria implemented
- [ ] Tests written and passing for every user story
- [ ] Edge cases covered with tests
- [ ] Non-functional requirements addressed
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Directory Structure

```
/spec-driven-development/
├── overview-spec-driven-development.md    # This file
├── feature-spec-template.md               # Feature specification template
├── api-spec-template.md                   # API/backend specification template
├── frontend-ui-spec-template.md           # UI specification template
├── testing-strategy-spec.md               # Testing strategy and guidance
├── non-functional-spec.md                 # Cross-cutting requirements
├── ai-agent-orchestration-spec.md         # Multi-agent workflow spec
└── features/                              # Project-specific feature specs
    └── [feature-name]-spec.md
```

## Checklist for AI Agents

Before starting implementation:

- [ ] Located and read the relevant spec file(s)
- [ ] Identified all acceptance criteria
- [ ] Understood test requirements
- [ ] Noted non-functional constraints
- [ ] Planned implementation approach aligned with spec

During implementation:

- [ ] Implementing exactly what spec describes
- [ ] Writing tests alongside code
- [ ] Following project coding standards
- [ ] Tracking which spec sections are covered

After implementation:

- [ ] All tests passing
- [ ] All checklist items in spec satisfied
- [ ] Documentation updated if required
- [ ] Ready for review

## Example Workflow

```typescript
interface SpecDrivenTask {
  specId: string;
  specFile: string;
  acceptanceCriteria: string[];
  testRequirements: string[];
  status: "pending" | "in-progress" | "complete";
}

const implementFeature = async (task: SpecDrivenTask): Promise<void> => {
  const spec = await readSpec(task.specFile);
  
  for (const criterion of task.acceptanceCriteria) {
    const implementation = await generateCode(spec, criterion);
    const tests = await generateTests(spec, criterion);
    
    await writeFiles(implementation);
    await writeFiles(tests);
    await runTests();
  }
  
  await updateDocumentation(spec);
  task.status = "complete";
};
```

This workflow applies to all projects scaffolded from this template. Treat `/spec-driven-development` as the contract between product, engineering, and AI assistants.

