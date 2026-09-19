# test: add Hono-Nest API and Vite behavioral parity

## Goal

Extend the parity harness so Hono and NestJS expose equivalent OpenAPI and runtime CRUD behavior and are consumable by the same Vite frontend without backend-specific application logic.

## Dependency

Depends on #78. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Build on the migration/golden harness from PR 1 after it is merged.
- Normalize OpenAPI semantically: paths, methods, parameters, request bodies, response schemas, status codes, and security requirements.
- Ignore harmless ordering, generator metadata, descriptions, and operationId differences unless already standardized.
- Run one shared runtime CRUD suite against both backends.
- Normalize client-visible errors without hiding meaningful semantic differences.
- Use one Vite frontend; backend selection must be configuration such as API_BASE_URL, not application branching.
- Reuse existing Playwright infrastructure if the golden UI already supports CRUD.

## Required acceptance tests

- `hono_and_nest_expose_equivalent_openapi_contract`
- `hono_and_nest_create_behavior_matches`
- `hono_and_nest_get_behavior_matches`
- `hono_and_nest_list_behavior_matches`
- `hono_and_nest_update_behavior_matches`
- `hono_and_nest_delete_behavior_matches`
- `hono_and_nest_validation_behavior_matches`
- `hono_and_nest_not_found_behavior_matches`
- `same_vite_consumer_works_with_hono_and_nest`
- `frontend_contains_no_backend_specific_hono_nest_branching`
- `golden_hono_runtime_is_ready`
- `golden_nest_runtime_is_ready`

## Explicitly deferred

- schemaInfo v2
- auth
- authorization
- state machines
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
