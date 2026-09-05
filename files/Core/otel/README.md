# OpenTelemetry NodeSDK core

Merge-able NodeSDK bootstrap for Nest (`apps/api`) and Hono (repo-root).

The SDK starts only when `OTEL_ENABLED=true` or `OTEL_EXPORTER_OTLP_ENDPOINT`
is set. Set `OTEL_SDK_DISABLED=true` to force off. Auto-instrumentations can
be skipped with `OTEL_AUTO_INSTRUMENT=false` (useful in unit tests).

## Layout

```text
otel/sdk.ts                      startOpenTelemetry() / createNodeSdk()
instrumentation.ts               repo-root preload (Hono)
apps/api/src/instrumentation.ts  Nest preload (`--import ./src/instrumentation.ts`)
```

## Hono

```yaml
$USE_CORE:
  - /Core/hono-api
  - /Core/otel
```

```sh
bun --import ./instrumentation.ts api/index.ts
```

## Nest

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/otel
```

```sh
bun --import ./src/instrumentation.ts src/main.ts
```

from `apps/api`, or add `--import ./src/instrumentation.ts` to the Nest
`dev`/`start` scripts.

## Environment

- `OTEL_ENABLED` — set `true` to start without an exporter endpoint
- `OTEL_EXPORTER_OTLP_ENDPOINT` — standard OTLP endpoint (also starts the SDK)
- `OTEL_SERVICE_NAME` — defaults to `app`
- `OTEL_SDK_DISABLED` — standard disable switch
- `OTEL_AUTO_INSTRUMENT` — set `false` to skip `getNodeAutoInstrumentations()`
