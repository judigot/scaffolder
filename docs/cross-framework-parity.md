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

`POST /api/agent-scaffold/resolve` is an authenticated, bounded decision endpoint.
When `AI_GATEWAY_API_KEY` is configured, it calls Vercel AI Gateway's evaluation
API with `typesafe-ai/jev`. The key is read server-side only. The provider is
not allowed to fall back to direct TypeSafe, OpenAI, Anthropic, or another paid
model when Gateway evaluation fails.

Jev classifies only the existing allowed Scaffolder subsystems. Code validates the
choice, then deterministically maps a valid subsystem to the existing recommended
tests and agent. Confidence is an uncertainty signal, not a correctness guarantee:
the current review threshold is `0.75`. A choice below that threshold, a missing
or invalid confidence value, or an invalid subsystem returns
`status: "needs_review"`, `affectedSubsystem: "unknown"`, no recommended agent,
and no recommended tests. Invalid model output never silently becomes
`project-builder`.

Successful responses identify how they were evaluated:

- `provider: "vercel-ai-gateway"`, `evaluationMode: "live"`, and
  `model: "typesafe-ai/jev"` mean a live Gateway evaluation completed.
- `provider: "fake"` and `evaluationMode: "fake"` are available only when
  `SCAFFOLDER_DECISION_PROVIDER=fake` is explicitly selected outside production.
- Missing Gateway credentials, timeouts, and provider failures return sanitized
  `503` errors. They never masquerade as fake or live success.

The endpoint keeps its existing agent/Auth0 authentication. Jev does not generate
code, authorize actions, mutate repositories, bypass validation or CI, or decide
production readiness. `POST /api/agent-scaffold` and its generation/validation
path remain deterministic and independent of Jev.

Workflow-history analysis and reusable recipe distillation belong in
`judigot/agent-workspace`. Scaffolder consumes bounded decisions only; do not add
a duplicate commit-history classifier or speculative recipe-selection pipeline
here.

### Live smoke test

Ordinary CI uses mocks/fakes and does not need Gateway credentials or paid calls.
Before an opt-in live check, confirm current Gateway pricing for
`typesafe-ai/jev`; pricing and promotions can change.

With a deployed endpoint that has `AI_GATEWAY_API_KEY` configured, run the
opt-in authenticated smoke test:

```sh
export RUN_LIVE_JEV_SMOKE=1
export SCAFFOLDER_RESOLVE_URL="https://YOUR_SCAFFOLDER_HOST/api/agent-scaffold/resolve"
export SCAFFOLDER_AGENT_API_KEY="YOUR_AGENT_API_KEY"
./scripts/smoke-agent-scaffold-resolve.sh
```

The script sends one bounded classification request and asserts
`provider: "vercel-ai-gateway"`, `evaluationMode: "live"`, and
`model: "typesafe-ai/jev"`. It refuses to run unless
`RUN_LIVE_JEV_SMOKE=1` is set so the operator has an explicit checkpoint to
review current Gateway pricing first.

A `200` alone is not proof that Gateway was used. The smoke test must assert the
live provider/mode/model fields above. Do not claim live verification unless this
request actually succeeds against the configured Gateway.

## Test workflow

Use focused commands while iterating:

```sh
bun test src/decision/decisionProvider.test.ts src/tests/contracts/applicationContract.test.ts
bun test src/tests/app/routes/agentScaffoldResolve.test.ts
```

Future adapters should add normalized migration/OpenAPI/runtime parity tests,
then run the same Vite Playwright suite against each backend.

