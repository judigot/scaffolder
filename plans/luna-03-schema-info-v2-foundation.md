# feat: evolve schemaInfo for application architecture

## Goal

Evolve schemaInfo incrementally from database-shape metadata toward an application contract while preserving existing schemas and proving Hono/NestJS parity for the first advanced capabilities.

## Dependency

Depends on #79. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Do not invent a separate schema format; extend the existing schemaInfo model.
- Keep old valid schemaInfo inputs working.
- Add framework-neutral metadata only.
- First capabilities: relationships, API exposure, validation constraints, auth-required metadata, authorization metadata shape, and lifecycle/state metadata shape.
- Do not put Nest decorators, Hono middleware filenames, Laravel classes, or Spring annotations in schemaInfo.
- Generate only capabilities that both current Hono and NestJS adapters can support correctly; unsupported capabilities must fail explicitly rather than being silently ignored.
- Use the canonical application-contract layer only if a minimal abstraction is needed; do not build a universal DSL.

## Required acceptance tests

- `legacy_schema_info_remains_supported`
- `schema_info_parses_one_to_one_relationship`
- `schema_info_parses_one_to_many_relationship`
- `schema_info_parses_many_to_many_relationship`
- `api_exposure_disabled_delete_is_not_generated`
- `api_exposure_disabled_delete_is_not_in_openapi`
- `validation_min_max_length_has_hono_nest_runtime_parity`
- `validation_constraints_have_openapi_parity`
- `unsupported_schema_capability_fails_explicitly`

## Explicitly deferred

- full RBAC enforcement
- OAuth implementation
- state-machine runtime enforcement
- jobs/queues
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
