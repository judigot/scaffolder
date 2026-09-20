# feat: add optional Jev decision plane for scaffolding

## Goal

Add Jev as an optional, provider-abstracted bounded-decision layer for Scaffolder development and user intent resolution without putting AI in deterministic generation, validation, security, or GitHub execution paths.

## Dependency

Depends on #84. Rebase onto latest main after the dependency merges before implementation.

## Scope

- Verify the current official Jev/TypeSafe API before coding; do not invent SDK/API details.
- Create `IDecisionProvider`, `JevDecisionProvider`, and `FakeDecisionProvider`.
- Keep Jev feature-flagged and fully optional.
- Development routing: classify schemaInfo gap vs generator bug vs Core/template bug vs migration/OpenAPI/auth/frontend parity issue; recommend agent, tests, and frontier-model escalation.
- User side: add `POST /api/agent-scaffold/resolve` that returns recommendations only and never writes to GitHub.
- Explicit user constraints always beat Jev.
- Existing `POST /api/agent-scaffold` remains deterministic and unchanged.
- Never send secrets, tokens, private keys, .env values, or huge raw logs to Jev.

## Required acceptance tests

- `jev_disabled_does_not_change_existing_scaffolding`
- `fake_decision_provider_drives_deterministic_tests`
- `explicit_constraints_cannot_be_overridden_by_jev`
- `low_confidence_requires_review`
- `missing_schema_routes_to_schema_builder`
- `jev_provider_timeout_degrades_safely`
- `malformed_jev_response_degrades_safely`
- `development_router_classifies_schema_info_gap`
- `development_router_classifies_migration_parity_failure`
- `development_router_recommends_relevant_agent_and_tests`
- `resolve_endpoint_performs_no_github_writes`

## Explicitly deferred

- Jev autonomous execution
- automatic destructive recovery
- arbitrary AI-generated Core composition

## Implementation rules

Use TDD. Keep normal CI independent of live Jev credentials with `FakeDecisionProvider`. Jev must remain optional and failure-safe. Do not alter deterministic safety paths.

Do not claim completion while required acceptance behavior is failing.
