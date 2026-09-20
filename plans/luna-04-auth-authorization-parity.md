# feat: add production auth and authorization parity

## Goal

Add framework-native production authentication and authorization behind one client-facing contract so the same frontend can use Hono and NestJS without backend-specific auth logic.

## Dependency

Depends on #80. Rebase onto latest main after the dependency merges before implementation.

## Implementation rules

- Use TDD: add/confirm the relevant failing tests before implementation.
- Inspect current repository code and reuse existing helpers; current main is authoritative.
- Preserve unrelated behavior and existing tests.
- Do not weaken tests merely to make the implementation pass.
- Keep framework-specific implementations idiomatic while testing observable parity.
- Run focused tests first, then the affected existing test suites, typecheck/lint, and `git diff --check`.

## Scope

- Support local registration/login/logout/current-user/session behavior.
- Keep PostgreSQL/Neon compatibility.
- For TypeScript backends prefer the repository's current Better Auth direction where appropriate.
- Design OAuth/OIDC capability behind a common contract; CI must use mocks/test providers, not real social credentials.
- Add roles and resource ownership metadata/enforcement.
- Keep implementation idiomatic per framework while preserving client-visible parity.
- Never put credentials or live OAuth secrets in tests.

## Required acceptance tests

- `auth_register_behavior_matches`
- `auth_duplicate_registration_behavior_matches`
- `auth_login_behavior_matches`
- `auth_invalid_credentials_behavior_matches`
- `auth_me_authenticated_behavior_matches`
- `auth_me_anonymous_behavior_matches`
- `auth_logout_behavior_matches`
- `oauth_initiation_contract_matches_with_mock_provider`
- `oauth_callback_contract_matches_with_mock_provider`
- `anonymous_protected_operation_is_denied`
- `owner_can_update_own_resource`
- `non_owner_cannot_update_others_resource`
- `admin_can_update_others_resource`
- `owner_can_delete_own_resource`
- `non_owner_cannot_delete_others_resource`

## Explicitly deferred

- real external OAuth provider E2E
- complex policy DSL
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
