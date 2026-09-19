# Cross-framework parity foundation

Scaffolder uses existing `schemaInfo` as the backward-compatible input and
normalizes it into an `ApplicationContract` before framework-specific
generation. The contract is intentionally small: entities, columns,
relationships, PostgreSQL as the parity target, and common CRUD operations.

Adapters remain idiomatic. Hono and NestJS are the first parity targets;
Spring Boot and Laravel must satisfy the same normalized database, OpenAPI,
authentication, authorization, error, and shared-Vite behavior contracts
before they are treated as golden backends.

## Jev decision plane

`POST /api/agent-scaffold/resolve` provides bounded recommendations. It uses
the official `@typesafe-ai/sdk` only when the server has `TYPESAFE_API_KEY`.
Without that key it uses a deterministic fake provider, so generation and
tests never depend on Jev or a network call.

Jev can classify an affected subsystem and recommend an agent/tests. It never
changes files, executes generators, validates schema, or replaces parity
tests. The deterministic `POST /api/agent-scaffold` executor remains the only
code-generation path.

## Test workflow

Use focused commands while iterating:

```sh
bun test src/decision/decisionProvider.test.ts src/tests/contracts/applicationContract.test.ts
bun test src/tests/app/routes/agentScaffoldResolve.test.ts
```

Future adapters should add normalized migration/OpenAPI/runtime parity tests,
then run the same Vite Playwright suite against each backend.

