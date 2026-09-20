# feat: scaffold domain actions and lifecycle parity

## Goal

Move generated backends beyond CRUD by making business invariants, custom actions, and state transitions first-class application-contract features with shared behavioral parity tests.

## Dependency

Depends on #81. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Extend schemaInfo/application metadata only as required by real parity cases.
- Add custom domain actions instead of forcing all behavior through CRUD.
- Add lifecycle/state-machine metadata and service/domain-level enforcement.
- Add business invariants that run consistently across Hono and NestJS.
- Keep controllers/routes thin; do not implement domain rules only in transport handlers.
- Represent future events/jobs metadata only if required for a concrete tested behavior.

## Required acceptance tests

- `custom_domain_action_is_generated_for_hono_and_nest`
- `custom_domain_action_openapi_contract_matches`
- `pending_to_paid_is_allowed`
- `pending_to_cancelled_is_allowed`
- `paid_to_fulfilled_is_allowed`
- `fulfilled_to_pending_is_rejected`
- `cancelled_to_paid_is_rejected`
- `business_invariant_behavior_matches_between_hono_and_nest`
- `invalid_transition_has_equivalent_error_semantics`

## Explicitly deferred

- CQRS
- event sourcing
- microservices
- full queue execution
- Spring Boot
- Laravel
- Jev

## Completion report

Report:
1. tests added/updated;
2. implementation changes;
3. commands run;
4. remaining failures;
5. intentional framework-specific differences;
6. deferred work.

Do not claim completion while required acceptance tests fail.
