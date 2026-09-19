# feat: add Laravel golden backend parity

## Goal

Add an idiomatic production-grade Laravel backend adapter that satisfies the existing database/API/auth/frontend parity suite.

## Dependency

Depends on #83. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Generate idiomatic Laravel routes, controllers, request validation, models, policies/gates, migrations, resources, auth integration, OpenAPI integration, and health behavior.
- Use Laravel-native migrations and persistence; do not force Drizzle into Laravel.
- Use local auth plus an OAuth-capable framework-native approach such as Socialite when consistent with current Laravel conventions.
- The resulting PostgreSQL schema must match the canonical normalized schema.
- Reuse the same behavioral parity suite and Vite frontend.
- Avoid Laravel-specific frontend branches.

## Required acceptance tests

- `laravel_migrations_match_canonical_postgres_schema`
- `laravel_openapi_matches_canonical_contract`
- `laravel_crud_behavior_matches_canonical_suite`
- `laravel_validation_behavior_matches_canonical_suite`
- `laravel_auth_behavior_matches_canonical_suite`
- `laravel_authorization_behavior_matches_canonical_suite`
- `same_vite_consumer_works_with_laravel`
- `golden_laravel_runtime_is_ready`

## Explicitly deferred

- Jev
- new schemaInfo capabilities unrelated to parity

## Completion report

Report:
1. tests added/updated;
2. implementation changes;
3. commands run;
4. remaining failures;
5. intentional framework-specific differences;
6. deferred work.

Do not claim completion while required acceptance tests fail.
