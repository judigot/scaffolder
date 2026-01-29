Below is the Startup Creator PRD / FRD, written as a standalone, executable product document that cleanly complements (but does not repeat) the Scaffolder PRD you finalized earlier.

This document assumes Scaffolder already exists as a deterministic, CI-governed system and defines how the Startup Creator sits on top of it.


---

Product Name (Working)

Startup Creator Agent


---

Product Intent

Build a long-running, AI-driven startup exploration and creation system that continuously scans the external world for problems and opportunities, proposes startup ideas, and—when approved—uses Scaffolder to bootstrap production-grade backend infrastructure.

The Startup Creator is not a financial agent and not an autonomous founder.
It is an idea discovery, validation, and execution assistant that operates under strict human approval, deterministic tooling, and CI-based verification.


---

Primary Goals

1. Continuously ingest signals from the internet (news, discussions, developer ecosystems).


2. Identify recurring problems, unmet needs, and emerging opportunities.


3. Synthesize these signals into structured startup ideas.


4. Propose MVP scopes and technical plans.


5. When approved, invoke Scaffolder to generate backend infrastructure for the MVP.


6. Maintain a traceable history of ideas, decisions, and outcomes.


7. Operate indefinitely without drifting, hallucinating progress, or taking unauthorized actions.




---

Non-Goals

The agent does not autonomously spend money.

The agent does not autonomously launch businesses.

The agent does not run marketing campaigns.

The agent does not execute financial transactions.

The agent does not deploy to production environments without approval.

The agent does not replace strategic human judgment.



---

Core Philosophy

The Startup Creator is exploratory, but never authoritative.

It may:

observe,

suggest,

analyze,

and prepare execution plans.


It may not:

decide,

commit resources,

or redefine success.


All irreversible actions require human approval.


---

User Personas

1. Solo Founder
Wants a constant stream of thoughtful startup ideas grounded in real-world signals, without noise.


2. Technical Entrepreneur
Wants ideas that can be quickly turned into working backend infrastructure.


3. Builder-in-Residence
Wants to explore opportunities while staying focused on execution.




---

System Overview

The Startup Creator is a persistent agent that runs continuously in a controlled environment (e.g., EC2). It operates in cycles:

Observe → Analyze → Propose → Wait → Execute (if approved)


It integrates tightly with Scaffolder but remains logically separate.


---

Data Ingestion Layer

Signal Sources

The system ingests signals from configurable sources, such as:

RSS feeds (tech news, startup blogs)

Reddit (specific subreddits)

GitHub (trending repositories, issues, discussions)

Hacker News or similar forums


Ingestion is automated and scheduled.


---

Ingestion Tooling

n8n is used for:

RSS polling

deduplication

basic classification

scheduling

notification triggers



Raw signals are stored for traceability.


---

Analysis and Synthesis

The agent periodically processes ingested signals to:

cluster similar topics,

identify recurring complaints or requests,

detect emerging technical trends,

extract implicit problems (not just explicit asks).


The output of this phase is structured idea candidates, not prose.

Each idea candidate includes:

problem statement,

affected user segment,

evidence (links to sources),

novelty vs competition estimate,

rough technical feasibility.



---

Idea Proposal Format

Ideas are presented to the human in a structured, comparable format.

Each proposal includes:

idea title,

concise problem description,

why this problem exists now,

who experiences the pain,

why existing solutions are insufficient,

confidence level (low / medium / high),

suggested MVP scope.


The agent may rank ideas but does not select winners.


---

Human Approval Loop

The human may respond to each idea with:

approve for exploration,

request refinement,

defer,

reject.


No execution proceeds without explicit approval.

Approval is recorded as an auditable decision.


---

MVP Planning Phase (If Approved)

When an idea is approved, the agent enters a planning phase.

It produces:

a proposed product boundary (what is in / out),

a suggested backend domain model,

a high-level schema outline,

a technical stack recommendation (within supported Scaffolder presets).


This phase remains reversible.


---

Integration with Scaffolder

Once the human approves the MVP plan:

1. The Startup Creator invokes Scaffolder’s AI-driven schema workflow.


2. The agent collaborates with Scaffolder to:

finalize schema via validation gates,

propose a build plan,

trigger Project Builder execution.



3. Scaffolder handles:

deterministic code generation,

repo creation,

CI validation.




The Startup Creator does not bypass Scaffolder’s rules.


---

Execution Boundaries

The Startup Creator:

may invoke Scaffolder tools,

may read CI results,

may propose fixes.


It may not:

alter Scaffolder templates directly,

push code outside Scaffolder’s pipeline,

suppress CI failures.



---

Long-Running Operation Model

The Startup Creator is designed to run indefinitely.

Characteristics:

event-driven cycles (not constant activity),

persistent state and checkpoints,

graceful restarts,

configurable budgets and limits,

global kill switch.


Idle time is expected and normal.


---

Memory and Traceability

All outputs are persisted as artifacts:

raw signals,

clustered insights,

idea proposals,

approval decisions,

MVP plans,

scaffolding outcomes.


There is no hidden memory inside the model.

This enables:

auditability,

learning without drift,

future retrospectives.



---

Permissions and Security

The agent never owns permanent credentials.

Any sensitive action (repo creation, deployment, secrets access) requires approval.

Secrets are brokered via a secure manager.

Access is scoped, time-limited, and logged.



---

Escalation and Communication

The agent communicates with the human via email when:

an idea is ready for review,

approval is required,

execution is blocked,

repeated failures occur.


Email is chosen for durability and auditability.


---

Failure Modes and Handling

Low-confidence ideas are deprioritized, not forced.

Rejected ideas are archived, not retried endlessly.

Execution failures escalate after bounded retries.

The agent never “pretends” progress.



---

Definition of Success

The Startup Creator is successful if:

It continuously surfaces high-quality, evidence-backed startup ideas.

It reduces the cognitive load of opportunity discovery.

It enables rapid transition from idea → CI-passing backend via Scaffolder.

It operates safely, predictably, and under human control.



---

Final Principle

The Startup Creator does not try to be a founder.

It exists to amplify the founder’s judgment, shorten feedback loops, and turn real-world signals into executable infrastructure—without ever crossing the boundary of authority.


---

This document is intentionally complete and orthogonal to the Scaffolder PRD.
An agent or engineering team should be able to implement the Startup Creator directly from this specification.