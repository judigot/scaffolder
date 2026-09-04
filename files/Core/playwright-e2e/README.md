# Playwright e2e core

Extracted from `/Core/template-monorepo/e2e` so other goldens can `$USE_CORE`
it. The vendored `template-monorepo/e2e` copy remains until this core is the
source of truth.

## Layout

```text
e2e/   Playwright package (`@bigbang/e2e`)
```

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/playwright-e2e
```

Put this core **after** the monorepo skeleton so `e2e/` overlays the vendored
copy. Other goldens can `$USE_CORE: /Core/playwright-e2e` and override
`e2e/playwright.config.ts` / `e2e/tests` as needed.

## Origins

Defaults match the template-monorepo ports:

- `E2E_API_ORIGIN` (default `http://127.0.0.1:3000`)
- `E2E_VITE_ORIGIN` (default `http://127.0.0.1:3001`)
- `E2E_NEXT_ORIGIN` (default `http://127.0.0.1:3002`)
