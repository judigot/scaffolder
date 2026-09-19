# test: establish Hono-Nest golden migration parity

## Goal

Build the first reusable cross-framework golden test harness and prove that the same schemaInfo generates Hono and NestJS backends whose migrations converge to the same PostgreSQL schema.

## Dependency

Foundation PR. No dependency on another PR in this series.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Use template-monorepo as the canonical golden reference where the current architecture allows it.
- Create one shared User/Post schemaInfo fixture using the repository's existing schemaInfo format.
- Generate Hono and NestJS from the same fixture.
- Create a reusable golden backend test harness; do not duplicate Hono/Nest test logic.
- Apply generated migrations to isolated PostgreSQL databases/schemas.
- Introspect and normalize the resulting PostgreSQL schemas.
- Compare tables, columns, types, nullability, defaults, PKs, FKs, unique constraints, and indexes semantically.
- Ignore framework-generated constraint/index names, ordering, migration filenames, and SQL formatting.
- Keep existing generation behavior backward compatible.

## Required acceptance tests

- `generates_hono_and_nest_from_same_schema_info`
- `hono_and_nest_migrations_converge_to_same_postgres_schema`
- `hono_and_nest_primary_keys_match`
- `hono_and_nest_unique_constraints_match`
- `hono_and_nest_foreign_keys_match`
- `hono_and_nest_indexes_match`
- `migration_parity_failure_reports_semantic_difference`

## Explicitly deferred

- OpenAPI parity
- shared Vite E2E
- schemaInfo v2
- auth
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
