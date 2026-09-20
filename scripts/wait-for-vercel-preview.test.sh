#!/bin/sh
set -eu

base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=$base/wait-for-vercel-preview.sh
fixture=$base/test-fixtures/vercel-preview
pass=0
tmp=
trap '[ -z "$tmp" ] || rm -rf "$tmp"' EXIT

run_case() {
	name=$1
	expected=$2
	probes=$3
	diagnostic=$4
	tmp=$(mktemp -d)
	bin=$tmp/bin
	mkdir "$bin"
	cp "$fixture"/* "$bin"/
	chmod +x "$bin"/*
	out=$tmp/output
	: >"$out"
	printf '0\n' >"$tmp/date"
	: >"$tmp/calls"
	rc=0
	PATH="$bin:$PATH" MOCK_SCENARIO=$name MOCK_DATE_COUNTER=$tmp/date \
		MOCK_CALL_LOG=$tmp/calls GITHUB_TOKEN=dummy GITHUB_REPOSITORY=example/repo \
		EXPECTED_SHA=0123456789012345678901234567890123456789 GITHUB_OUTPUT=$out \
		VERCEL_PREVIEW_TIMEOUT_SECONDS=3 VERCEL_PREVIEW_POLL_SECONDS=0 \
		sh "$target" >"$tmp/stdout" 2>"$tmp/err" || rc=$?
	if [ "$rc" != "$expected" ]; then
		printf 'not ok - %s (exit %s, expected %s)\n' "$name" "$rc" "$expected"
		cat "$tmp/err"
		exit 1
	fi
	count=$(grep -c '^probe$' "$tmp/calls" || true)
	if [ "$count" -ne "$probes" ]; then
		printf 'not ok - %s (probes %s, expected %s)\n' "$name" "$count" "$probes"
		exit 1
	fi
	if [ -n "$diagnostic" ]; then
		grep -F "$diagnostic" "$tmp/err" >/dev/null || {
			printf 'not ok - %s (missing diagnostic: %s)\n' "$name" "$diagnostic"
			exit 1
		}
	fi
	if [ "$expected" -eq 0 ]; then
		[ "$(cat "$out")" = 'deployment_url=https://demo.vercel.app' ] || exit 1
	else
		[ ! -s "$out" ] || exit 1
	fi
	printf 'ok - %s\n' "$name"
	pass=$((pass + 1))
	rm -rf "$tmp"
	tmp=
}

run_case pending_feedback 1 0 'pending'
run_case failure 1 0 'failure'
run_case success 0 1 ''
run_case stale_sha 1 2 'stale'
run_case stale_then_ready 0 2 ''
run_case missing_header 1 2 'stale'
run_case wrong_sha 1 2 'stale'
run_case wrong_publisher 1 0 'timed out'
run_case wrong_head 1 0 'timed out'
run_case malformed_check 1 0 'timed out'
run_case malformed_status 1 0 'invalid JSON'
run_case auth_failure 1 0 'invalid JSON'
run_case exact_context 1 0 'no successful Vercel deployment status'
printf 'passed %s behavioral resolver tests\n' "$pass"
