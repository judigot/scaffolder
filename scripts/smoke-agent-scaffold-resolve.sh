#!/bin/sh
set -eu

if [ "${RUN_LIVE_JEV_SMOKE:-}" != "1" ]; then
  printf '%s\n' 'Refusing live Jev smoke test. Check current Vercel AI Gateway pricing, then set RUN_LIVE_JEV_SMOKE=1.'
  exit 2
fi

: "${SCAFFOLDER_RESOLVE_URL:?Set SCAFFOLDER_RESOLVE_URL to the deployed /api/agent-scaffold/resolve endpoint}"
: "${SCAFFOLDER_AGENT_API_KEY:?Set SCAFFOLDER_AGENT_API_KEY for endpoint authentication}"

command -v curl >/dev/null 2>&1 || {
  printf '%s\n' 'curl is required'
  exit 2
}
command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'jq is required'
  exit 2
}

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT HUP INT TERM

curl --fail-with-body "$SCAFFOLDER_RESOLVE_URL" \
  -H "Authorization: Bearer $SCAFFOLDER_AGENT_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"input":"Migration parity failed because an index is missing.","failure":"migration parity failed"}' \
  >"$response_file"

jq -e '
  .ok == true and
  .decision.provider == "vercel-ai-gateway" and
  .decision.evaluationMode == "live" and
  .decision.model == "typesafe-ai/jev"
' "$response_file" >/dev/null

printf '%s\n' 'Live Jev Gateway smoke test passed.'
