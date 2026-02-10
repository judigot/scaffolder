#!/usr/bin/env bash

set -euo pipefail

echo "[Golden Frameworks] Starting generated framework API E2E run"
"$(dirname "$0")/run-generated-api-e2e.sh"
