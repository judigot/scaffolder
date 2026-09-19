# feat: add Spring Boot golden backend parity

## Goal

Add an idiomatic production-grade Spring Boot backend adapter that satisfies the existing parity suite rather than introducing a separate Spring-specific behavioral contract.

## Dependency

Depends on #82. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Generate idiomatic Spring Boot layers: controllers, services, repositories/data access, DTOs, validation, security, exception handling, migrations, OpenAPI, and health.
- Use native Java/Spring database and migration tooling; do not force Drizzle into Spring.
- The resulting PostgreSQL schema must match the canonical normalized schema.
- Spring OpenAPI and runtime behavior must satisfy the same existing contract tests.
- The same Vite frontend must work against Spring with only API_BASE_URL/configuration changes.
- Add only Spring-specific harness plumbing that is necessary to plug into the existing parity suite.

## Required acceptance tests

- `spring_migrations_match_canonical_postgres_schema`
- `spring_openapi_matches_canonical_contract`
- `spring_crud_behavior_matches_canonical_suite`
- `spring_validation_behavior_matches_canonical_suite`
- `spring_auth_behavior_matches_canonical_suite`
- `spring_authorization_behavior_matches_canonical_suite`
- `same_vite_consumer_works_with_spring`
- `golden_spring_runtime_is_ready`

## Explicitly deferred

- Laravel
- Jev
- new application-contract semantics unless strictly required

## Completion report

Report:
1. tests added/updated;
2. implementation changes;
3. commands run;
4. remaining failures;
5. intentional framework-specific differences;
6. deferred work.

Do not claim completion while required acceptance tests fail.
