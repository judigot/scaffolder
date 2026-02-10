#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-15432}"
DB_USER="${DB_USER:-scaffolder}"
DB_PASS="${DB_PASS:-scaffolder123}"
GOLDEN_DB_NAME="${GOLDEN_DB_NAME:-scaffolder}"
DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${GOLDEN_DB_NAME}"

export DATABASE_URL="$DB_URL"

echo "[Golden Frameworks] Running golden app integrity suite against $DATABASE_URL"
cd "$ROOT_DIR"
bun run scripts/test-golden-apps.ts

if [[ "${RUN_LEGACY_E2E:-0}" == "1" ]]; then
  echo "[Golden Frameworks] Running legacy generated framework API suites"
  "$SCRIPT_DIR/run-generated-api-e2e.sh"
fi
