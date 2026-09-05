#!/bin/sh
# Unit tests for scripts/resolve-vercel-bypass.sh
# Never print secret values.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=resolve-vercel-bypass.sh
. "$SCRIPT_DIR/resolve-vercel-bypass.sh"

FAILED=0
RAN=0

clear_bypass_env() {
	VERCEL_AUTOMATION_BYPASS_SECRET=
	VERCEL_PROTECTION_BYPASS_SECRET=
	VERCEL_PROTECTION_BYPASS=
	VERCEL_BYPASS_SECRET=
	PROTECTION_BYPASS_SECRET=
	VERCEL_AUTOMATION_BYPASS=
	VERCEL_TOKEN=
	VERCEL_ORG_ID=
	VERCEL_PROJECT_ID=
	VERCEL_TEAM_ID=
	export VERCEL_AUTOMATION_BYPASS_SECRET VERCEL_PROTECTION_BYPASS_SECRET \
		VERCEL_PROTECTION_BYPASS VERCEL_BYPASS_SECRET PROTECTION_BYPASS_SECRET \
		VERCEL_AUTOMATION_BYPASS VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID \
		VERCEL_TEAM_ID
}

expect_empty() {
	_name=$1
	RAN=$((RAN + 1))
	_out=$(resolve_bypass_from_aliases || true)
	if [ -n "$_out" ]; then
		printf '%s\n' "not ok - $_name (expected empty)"
		FAILED=$((FAILED + 1))
		return
	fi
	printf '%s\n' "ok - $_name"
}

expect_resolved() {
	_name=$1
	_expected=$2
	RAN=$((RAN + 1))
	_out=$(resolve_bypass_from_aliases || true)
	if [ "$_out" != "$_expected" ]; then
		printf '%s\n' "not ok - $_name (resolver mismatch)"
		FAILED=$((FAILED + 1))
		return
	fi
	printf '%s\n' "ok - $_name"
}

expect_output_omits() {
	_name=$1
	_needle=$2
	_log=$3
	RAN=$((RAN + 1))
	if printf '%s' "$_log" | grep -F "$_needle" >/dev/null; then
		printf '%s\n' "not ok - $_name (secret leaked)"
		FAILED=$((FAILED + 1))
		return
	fi
	printf '%s\n' "ok - $_name"
}

clear_bypass_env
expect_empty "no aliases set"

clear_bypass_env
VERCEL_PROTECTION_BYPASS_SECRET='alias-protection-bypass-secret'
export VERCEL_PROTECTION_BYPASS_SECRET
expect_resolved "uses VERCEL_PROTECTION_BYPASS_SECRET alias" "alias-protection-bypass-secret"

clear_bypass_env
VERCEL_BYPASS_SECRET='alias-bypass-secret'
VERCEL_PROTECTION_BYPASS='alias-protection-bypass'
export VERCEL_BYPASS_SECRET VERCEL_PROTECTION_BYPASS
expect_resolved "prefers VERCEL_PROTECTION_BYPASS over VERCEL_BYPASS_SECRET" "alias-protection-bypass"

clear_bypass_env
VERCEL_AUTOMATION_BYPASS_SECRET='canonical-bypass-secret'
VERCEL_BYPASS_SECRET='alias-bypass-secret'
export VERCEL_AUTOMATION_BYPASS_SECRET VERCEL_BYPASS_SECRET
expect_resolved "prefers canonical VERCEL_AUTOMATION_BYPASS_SECRET" "canonical-bypass-secret"

clear_bypass_env
VERCEL_AUTOMATION_BYPASS='legacy-automation-bypass'
export VERCEL_AUTOMATION_BYPASS
expect_resolved "uses VERCEL_AUTOMATION_BYPASS alias" "legacy-automation-bypass"

clear_bypass_env
FAKE_SECRET='do-not-print-this-bypass-value'
VERCEL_BYPASS_SECRET=$FAKE_SECRET
export VERCEL_BYPASS_SECRET
_resolved=$(resolve_bypass_from_aliases)
_combined=$(printf '%s\n' "resolved-without-logging")
expect_output_omits "test harness does not echo alias values" "$FAKE_SECRET" "$_combined"
if [ "$_resolved" != "$FAKE_SECRET" ]; then
	printf '%s\n' "not ok - resolver returned the alias value"
	FAILED=$((FAILED + 1))
	RAN=$((RAN + 1))
else
	RAN=$((RAN + 1))
	printf '%s\n' "ok - resolver returned the alias value"
fi

if [ "$FAILED" -ne 0 ]; then
	printf '%s\n' "$FAILED/$RAN bypass resolver tests failed"
	exit 1
fi

printf '%s\n' "$RAN bypass resolver tests passed"
