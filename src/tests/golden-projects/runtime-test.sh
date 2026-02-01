#!/bin/bash

# Runtime Golden Test
#
# Verifies generated projects work at runtime:
# 1. Generate project with scaffolder
# 2. Create test database
# 3. Run Drizzle migrations
# 4. Execute seed file
# 5. Start API server
# 6. Run auto-generated api-test.sh
#
# Usage: ./runtime-test.sh [output-dir]
# Requires: PostgreSQL running via `bun run dev:full`

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
OUTPUT_DIR="${1:-/tmp/golden-runtime-test}"
TEST_DB_NAME="golden_test_db"
TEST_PORT=3999
API_BASE="http://localhost:${TEST_PORT}/api"

# Database config (matches compose.yml)
DB_HOST="localhost"
DB_PORT="15432"
DB_USER="scaffolder"
DB_PASSWORD="scaffolder123"
DB_NAME="scaffolder"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"

# Docker compose service name
POSTGRES_SERVICE="postgresql"
SCAFFOLDER_DIR=""

# Get container ID for postgresql service
get_postgres_container() {
  if [ -n "$SCAFFOLDER_DIR" ]; then
    docker compose -f "$SCAFFOLDER_DIR/compose.yml" ps -q "$POSTGRES_SERVICE" 2>/dev/null
  else
    docker ps --format '{{.Names}}' | grep -E 'postgres|postgresql' | head -1
  fi
}

# Track server PID
SERVER_PID=""

# Cleanup function
cleanup() {
  echo -e "\n${BLUE}Cleaning up...${NC}"

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  if command -v docker &> /dev/null; then
    local container
    container=$(get_postgres_container 2>/dev/null)
    if [ -n "$container" ]; then
      docker exec -e PGPASSWORD="$DB_PASSWORD" "$container" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true
    fi
  fi
}

trap cleanup EXIT

log_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }

docker_psql() {
  local container
  container=$(get_postgres_container)
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$container" psql -h localhost -U "$DB_USER" -d "$1" -c "$2"
}

# Set scaffolder directory
SCAFFOLDER_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

# Check prerequisites
log_step "Checking prerequisites"

command -v docker &> /dev/null || { log_error "docker not found"; exit 1; }
command -v bun &> /dev/null || { log_error "bun not found"; exit 1; }
command -v jq &> /dev/null || { log_error "jq not found"; exit 1; }

POSTGRES_CONTAINER=$(get_postgres_container)
[ -z "$POSTGRES_CONTAINER" ] && { log_error "PostgreSQL container not running. Run 'bun run dev:full'"; exit 1; }
log_success "Found PostgreSQL container"

docker_psql "$DB_NAME" "SELECT 1" > /dev/null 2>&1 || { log_error "Cannot connect to PostgreSQL"; exit 1; }
log_success "Prerequisites OK"

# Setup test database
log_step "Setting up test database"
docker_psql "$DB_NAME" "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker_psql "$DB_NAME" "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true
docker_psql "$DB_NAME" "CREATE DATABASE ${TEST_DB_NAME};"
log_success "Created database: ${TEST_DB_NAME}"

# Generate project
log_step "Generating project"
cd "$SCAFFOLDER_DIR"
bun run src/tests/golden-projects/generate-project.ts "$OUTPUT_DIR" "$TEST_PORT"
log_success "Project generated"

# Install dependencies
log_step "Installing dependencies"
cd "$OUTPUT_DIR"
bun install --silent
log_success "Dependencies installed"

# Create .env file
cat > .env << EOF
DATABASE_URL=${DATABASE_URL}
PORT=${TEST_PORT}
EOF
log_success "Created .env file"

# Run migrations
log_step "Running database migrations"
DATABASE_URL="$DATABASE_URL" bunx drizzle-kit push --force
log_success "Migrations complete"

# Run seed
log_step "Seeding database"
DATABASE_URL="$DATABASE_URL" bun run api/db/seed.ts
log_success "Database seeded"

# Start server
log_step "Starting API server"
DATABASE_URL="$DATABASE_URL" PORT="$TEST_PORT" bun run api/index.ts &
SERVER_PID=$!

# Wait for server
for i in $(seq 1 30); do
  curl -s "$API_BASE/health" > /dev/null 2>&1 && break
  sleep 0.5
done

curl -s "$API_BASE/health" > /dev/null 2>&1 || { log_error "Server failed to start"; exit 1; }
log_success "Server started on port $TEST_PORT"

# Run the auto-generated api-test.sh
log_step "Running API tests"
chmod +x api-test.sh
./api-test.sh "$API_BASE"
