#!/bin/sh
# Unit tests for scripts/assert-hello-response.sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=assert-hello-response.sh
. "$SCRIPT_DIR/assert-hello-response.sh"

FAILED=0
RAN=0

reset_hello_env() {
	HELLO_HTTP_STATUS=
	HELLO_BODY=
	HELLO_LOCATION=
	HELLO_CONTENT_TYPE=
	HELLO_BYPASS_PRESENT=
	export HELLO_HTTP_STATUS HELLO_BODY HELLO_LOCATION HELLO_CONTENT_TYPE HELLO_BYPASS_PRESENT
}

expect_pass() {
	_name=$1
	RAN=$((RAN + 1))
	if assert_hello_response >/dev/null 2>&1; then
		printf '%s\n' "ok - $_name"
	else
		printf '%s\n' "not ok - $_name (expected pass)"
		FAILED=$((FAILED + 1))
	fi
}

expect_fail_message() {
	_name=$1
	_needle=$2
	RAN=$((RAN + 1))
	_err=$(mktemp)
	if assert_hello_response >/dev/null 2>"$_err"; then
		printf '%s\n' "not ok - $_name (expected fail)"
		FAILED=$((FAILED + 1))
		rm -f "$_err"
		return
	fi
	if grep -F "$_needle" "$_err" >/dev/null; then
		printf '%s\n' "ok - $_name"
	else
		printf '%s\n' "not ok - $_name (missing expected message)"
		FAILED=$((FAILED + 1))
	fi
	rm -f "$_err"
}

reset_hello_env
HELLO_HTTP_STATUS=200
HELLO_BODY='{"message":"Hello, world!"}'
HELLO_CONTENT_TYPE='application/json'
expect_pass "200 JSON contract"

reset_hello_env
HELLO_HTTP_STATUS=200
HELLO_BODY='{"message":"Hello, world!","extra":true}'
HELLO_CONTENT_TYPE='application/json'
expect_fail_message "rejects extra JSON fields" "Unexpected JSON"

reset_hello_env
HELLO_HTTP_STATUS=200
HELLO_BODY='{"message":"hi"}'
HELLO_CONTENT_TYPE='application/json'
expect_fail_message "rejects wrong message" "Unexpected JSON"

reset_hello_env
HELLO_HTTP_STATUS=404
HELLO_BODY='{"error":"not found"}'
HELLO_CONTENT_TYPE='application/json'
expect_fail_message "rejects non-200" "Expected HTTP 200"

reset_hello_env
HELLO_HTTP_STATUS=302
HELLO_LOCATION='https://vercel.com/sso-api?url=https%3A%2F%2Fexample.vercel.app%2Fapi%2Fhello'
HELLO_BODY='Redirecting...'
HELLO_CONTENT_TYPE='text/plain'
expect_fail_message "SSO 302 without bypass" "Add repository secret VERCEL_AUTOMATION_BYPASS_SECRET"

reset_hello_env
HELLO_HTTP_STATUS=302
HELLO_LOCATION='https://vercel.com/sso-api?url=https%3A%2F%2Fexample.vercel.app%2Fapi%2Fhello'
HELLO_BODY='Redirecting...'
HELLO_CONTENT_TYPE='text/plain'
HELLO_BYPASS_PRESENT=1
expect_fail_message "SSO 302 with bypass present" "x-vercel-protection-bypass was sent"

reset_hello_env
HELLO_HTTP_STATUS=401
HELLO_BODY='<html>Authentication Required</html>'
HELLO_CONTENT_TYPE='text/html'
expect_fail_message "SSO 401 HTML" "Vercel Authentication intercepted"

reset_hello_env
HELLO_HTTP_STATUS=200
HELLO_BODY='not json'
HELLO_CONTENT_TYPE='text/plain'
expect_fail_message "rejects non-JSON 200" "Response is not JSON"

if [ "$FAILED" -ne 0 ]; then
	printf '%s\n' "$FAILED/$RAN assertion helper tests failed"
	exit 1
fi

printf '%s\n' "$RAN assertion helper tests passed"
