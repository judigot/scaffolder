#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="/tmp/golden-projects-output"
LARAVEL_DIR="$OUTPUT_DIR/laravel"
HONO_DIR="$OUTPUT_DIR/masterSchema"
PG_CONTAINER="scaffolder-postgresql-1"
LOG_DIR="/tmp/scaffolder-e2e-logs/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$LOG_DIR"

info() { printf "\n[INFO] %s\n" "$1"; }
ok() { printf "[OK] %s\n" "$1"; }
fail() { printf "[FAIL] %s\n" "$1"; }

run() {
  local name="$1"
  shift
  info "$name"
  "$@" 2>&1 | tee "$LOG_DIR/${name// /_}.log"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    fail "Missing required command: $1"
    exit 1
  }
}

cleanup_server() {
  local pid="$1"
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" 2>/dev/null || true
  fi
}

require_cmd bun
require_cmd docker
require_cmd php
require_cmd composer
require_cmd jq
require_cmd curl

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-15432}"
DB_USER="${DB_USER:-scaffolder}"
DB_PASS="${DB_PASS:-scaffolder123}"

reset_db() {
  local db_name="$1"

  if command -v docker >/dev/null 2>&1 && docker ps --format "{{.Names}}" | grep -q "^${PG_CONTAINER}$"; then
    run "reset ${db_name} db" docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${db_name};"
    run "create ${db_name} db" docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${db_name};"
    return
  fi

  if ! command -v psql >/dev/null 2>&1; then
    fail "Neither docker service container nor psql client is available"
    exit 1
  fi

  run "reset ${db_name} db" bash -lc "PGPASSWORD='$DB_PASS' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -c \"DROP DATABASE IF EXISTS ${db_name};\""
  run "create ${db_name} db" bash -lc "PGPASSWORD='$DB_PASS' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d postgres -c \"CREATE DATABASE ${db_name};\""
}

cd "$ROOT_DIR"

run "generate hono golden" bun test src/tests/golden-projects/hono-react.test.ts
run "generate laravel golden" bun test src/tests/golden-projects/laravel.test.ts

if [[ ! -d "$LARAVEL_DIR" || ! -d "$HONO_DIR" ]]; then
  fail "Expected generated projects were not found in $OUTPUT_DIR"
  exit 1
fi

reset_db "laravel_golden"

cd "$LARAVEL_DIR"
run "laravel composer install" composer install --no-interaction --prefer-dist
run "laravel prepare env" bash -lc "cp .env.example .env && cat >> .env <<'EOF'
DB_CONNECTION=pgsql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_DATABASE=laravel_golden
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASS
EOF"
run "laravel key generate" php artisan key:generate --force
run "laravel migrate fresh" php artisan migrate:fresh --force

info "run laravel api-test"
php artisan serve --host=127.0.0.1 --port=1214 > "$LOG_DIR/laravel_server.log" 2>&1 &
LARAVEL_PID=$!
sleep 3
set +e
bash ./api-test.sh "http://127.0.0.1:1214/api" 2>&1 | tee "$LOG_DIR/laravel_api_test.log"
LARAVEL_TEST_EXIT=${PIPESTATUS[0]}
set -e
cleanup_server "$LARAVEL_PID"

reset_db "hono_react_test"

cd "$HONO_DIR"
run "hono install" bun install
run "hono drizzle push" bash -lc "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/hono_react_test\" bunx drizzle-kit push --config=drizzle.config.ts"

info "run hono api-test"
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/hono_react_test" bun run dev:api > "$LOG_DIR/hono_server.log" 2>&1 &
HONO_PID=$!
sleep 5
set +e
bash ./api-test.sh "http://127.0.0.1:3000/api" 2>&1 | tee "$LOG_DIR/hono_api_test.log"
HONO_TEST_EXIT=${PIPESTATUS[0]}
set -e
cleanup_server "$HONO_PID"

info "summary"
printf "Laravel api-test exit code: %s\n" "$LARAVEL_TEST_EXIT" | tee "$LOG_DIR/summary.log"
printf "Hono api-test exit code: %s\n" "$HONO_TEST_EXIT" | tee -a "$LOG_DIR/summary.log"
printf "Logs directory: %s\n" "$LOG_DIR" | tee -a "$LOG_DIR/summary.log"

if [[ "$LARAVEL_TEST_EXIT" -eq 0 && "$HONO_TEST_EXIT" -eq 0 ]]; then
  ok "All generated API tests passed"
  exit 0
fi

fail "One or more API test runs failed"
exit 1
