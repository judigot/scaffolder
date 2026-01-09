Below is a final, self-contained technical product document that captures all of your ideas in an executable, agent-readable form.
This is written deliberately like a PRD / FRD hybrid so you can hand it to an agent (or a future you) and say: “Build this.”
No summaries, no TL;DR, no code blocks—this is the canonical source.


---

Product Name (Working)

Startup Creator & Scaffolder: The Last Test


---

Product Intent

Build a conversational, agent-driven application scaffolding platform where users can describe what they want to build in natural language, and the system deterministically generates a production-grade backend application that passes CI as the final proof of correctness.

The platform combines:

conversational AI (for intent and planning),

schema-first design (for structure and safety),

deterministic project generation (for reliability),

and CI as the ultimate authority (for truth).


The system must support long-running autonomous agents that can perform real actions (not just generate text), while remaining fully constrained by validation gates, permissions, and human oversight.


---

Primary Goals

1. Allow users to define application data models and relationships through an AI chat interface.


2. Convert conversational intent into a validated, deterministic schema representation.


3. Use that schema to scaffold a backend application using predefined templates and framework boilerplate (Laravel, Bun, Hono, etc.).


4. Publish the generated application into a GitHub repository owned by the user.


5. Ensure the generated repository passes CI, including tests that validate all generated API routes.


6. Define “success” strictly as a CI-passing generated repository.


7. Enable autonomous agents to operate indefinitely toward these goals using gated, deterministic loops.




---

Non-Goals

The AI does not invent new frameworks or arbitrary architectures.

The AI does not bypass validation or CI.

The AI does not directly execute shell commands without mediation.

The AI does not own credentials or secrets.

The AI does not decide when something is “good enough” outside of defined tests.



---

Core Philosophy

AI is an operator, not an authority.

Authority lives in:

schemas,

structure tests,

deterministic generators,

CI pipelines,

and explicit human approvals.


Creativity is allowed only before validation gates.
After validation, everything must be deterministic and reproducible.


---

User Personas

1. Startup Founder / Solo Builder
Wants to move from idea → working backend fast, without hand-writing boilerplate.


2. Technical Builder
Wants predictable, schema-driven scaffolding with CI guarantees.


3. Power User
Wants to combine conversational schema design with manual overrides and imports.




---

User Experience Flow

1. Authentication and Context

The user logs into Scaffolder via GitHub OAuth.

The system establishes:

GitHub identity,

repository permissions (PAT or GitHub App),

publishing mode (create repo vs populate empty repo).


All generated assets are owned by the user.


---

2. Primary Interface: AI Chat

The primary UI is an embedded AI chat interface.

The user describes what they want to build in natural language.
Examples:

“I want a SaaS app with users, organizations, and subscriptions.”

“Users can have many projects.”

“Invoices should be immutable.”


The AI:

asks clarifying questions,

explains tradeoffs in plain language,

incrementally produces a draft schema representation.


At this stage:

no code is generated,

no repositories are touched,

no irreversible actions occur.


The chat exists to translate intent → structure.


---

3. Schema Construction and Editing

The schema produced by the AI is visible to the user.

The user may:

accept AI suggestions,

edit the schema manually,

switch to a form-based schema builder,

import an existing schema.


Multiple entry modes exist, but all converge to the same internal schema format.


---

4. Schema Validation Gate (Hard Stop)

The user explicitly triggers schema validation.

The system runs schema structure tests to verify:

entity definitions,

relationships,

constraints,

invariants,

internal consistency.


Outcomes:

If validation fails: errors are shown, and the AI helps revise the schema.

If validation passes: the schema becomes locked and accepted.


Once locked:

the schema is treated as source of truth,

subsequent steps must use it exactly.



---

5. Build Plan Proposal (AI-Orchestrated)

After schema acceptance, the AI switches from conversational mode to orchestration mode.

The AI proposes a build plan that includes:

framework selection (Laravel, Bun, Hono, etc., from supported presets),

template packs to apply (CRUD, auth, testing, CI, etc.),

expected outputs (routes, services, tests, workflows).


The plan is explicit and reviewable.

The user may approve or adjust high-level choices only.
No low-level code editing occurs here.


---

6. Project Builder Execution (Deterministic)

Upon approval, the AI invokes the Project Builder.

The Project Builder:

combines the validated schema,

applies selected templates,

applies selected framework boilerplate,

generates the full repository structure,

generates tests and CI configuration.


This step is deterministic:

same inputs → same outputs.


The AI does not manually write code; it invokes generation pipelines.


---

7. GitHub Publishing

The system publishes the generated files to GitHub.

Supported modes:

Create a new repository (via PAT).

Populate an existing empty repository (via GitHub App).


The commit history clearly reflects automated generation.


---

8. CI Execution (“The Last Test”)

GitHub Actions run automatically.

CI validates:

build integrity,

generated tests,

API route functionality.


CI outcome defines truth:

CI passes → success.

CI fails → the system is not done.



---

9. Bounded Fix Loop (If CI Fails)

If CI fails:

the AI reads CI logs,

diagnoses failures,

proposes the smallest viable fix,

applies fixes through allowed mechanisms (schema adjustments, template configuration, regeneration).


Retries are bounded.

If still failing after limits:

the AI escalates to the human with a structured report.


The AI never bypasses CI or suppresses failures.


---

Agent Architecture

Agent Role

The AI acts as an orchestrator that:

interprets user intent,

plans actions,

selects which tools to invoke,

evaluates tool outputs,

decides next steps within constraints.


The AI does not execute arbitrary commands directly.


---

Tool Execution Model

Actions are exposed to the AI as tools.

Examples of tool categories:

schema validation,

project builder invocation,

repository publishing,

CI status retrieval,

log summarization.


The AI selects a tool and provides structured arguments.

The system executes the tool and returns structured results.

This enables the AI to perform real actions safely.


---

Technology Choices

1. OpenAI Tool Calling with Structured Outputs
Used to allow the AI to invoke real system actions using strict schemas.
Ensures determinism, validation, and safety.


2. LangGraph (or equivalent state-machine framework)
Used to implement long-running, gated agent flows: schema → validate → build → publish → CI → fix/escalate.


3. MCP (Model Context Protocol)
Used to expose Scaffolder capabilities as reusable tool servers:

enables modularity,

allows multiple clients (web UI, CLI, IDE agents),

future-proofs the system.



4. n8n (Supporting Role)
Used for:

RSS ingestion,

notifications,

triggering agent runs,

non-core automation.




The core build and CI loop must live in Scaffolder, not in low-code workflows.


---

Long-Running Agent Model

Agents are persistent processes running in a controlled environment (e.g., EC2).

Characteristics:

event-driven, not constantly active,

stateful and resumable,

budget-bounded,

kill-switch enabled.


Agents operate indefinitely toward defined goals.


---

Deterministic Agent Goals

Two major agent objectives exist:

1. Scaffolder Continuation Agent
Goal: ensure Scaffolder can always generate CI-passing backend applications from schema.


2. Startup Creator Agent
Goal: explore product ideas, propose MVPs, and use Scaffolder to bootstrap infrastructure—always under human approval.



Both agents share the same underlying architecture and tool layer.


---

Security and Permissions

Agents never store permanent secrets.

Sensitive operations require explicit human approval.

Secrets live in a secure manager (e.g., Bitwarden).

Access is scoped, time-limited, and audited.



---

Escalation and Human Oversight

When blocked or uncertain:

the AI escalates via email,

presents context, options, and recommendations,

waits for explicit input.


Email is the primary escalation channel because it is durable and auditable.


---

Definition of Done (Non-Negotiable)

The system is considered successful when:

A user can describe an application in the AI chat, validate the resulting schema, scaffold a backend into a GitHub repository, and that repository’s CI passes with all generated API routes working as tested.

Nothing else defines success.


---

Guiding Principle (Final)

Use AI to execute disciplined engineering loops, not to replace judgment.

Human intent, deterministic generation, and CI validation together form the backbone of the system.


---

This document is intentionally complete.
An agent should be able to read this and begin execution without additional explanation.