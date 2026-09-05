#!/bin/sh
# Integration tests for scripts/check-api-hello.sh
# Never print secret values.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FAILED=0
RAN=0
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"; if [ -n "${SERVER_PID-}" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi' EXIT

ok() {
	RAN=$((RAN + 1))
	printf '%s\n' "ok - $1"
}

fail() {
	RAN=$((RAN + 1))
	FAILED=$((FAILED + 1))
	printf '%s\n' "not ok - $1"
}

expect_fail_contains() {
	_name=$1
	_needle=$2
	_file=$3
	if grep -F "$_needle" "$_file" >/dev/null; then
		ok "$_name"
	else
		fail "$_name (missing: $_needle)"
	fi
}

expect_omits() {
	_name=$1
	_needle=$2
	_file=$3
	if grep -F "$_needle" "$_file" >/dev/null; then
		fail "$_name"
	else
		ok "$_name"
	fi
}

_log=$(mktemp)
if sh "$SCRIPT_DIR/check-api-hello.sh" >"$_log" 2>&1; then
	fail "usage error exits non-zero"
else
	expect_fail_contains "usage mentions preview-base-url" "preview-base-url" "$_log"
fi

_log=$(mktemp)
if sh "$SCRIPT_DIR/check-api-hello.sh" "https://app-scaffolder.vercel.app" >"$_log" 2>&1; then
	fail "production host rejected"
else
	expect_fail_contains "refuses production hostname" "Refusing production hostname" "$_log"
fi

_log=$(mktemp)
if sh "$SCRIPT_DIR/check-api-hello.sh" "http://example.com" >"$_log" 2>&1; then
	fail "non-https rejected"
else
	expect_fail_contains "requires https" "Preview URL must use https://" "$_log"
fi

python3 - "$WORKDIR" <<'PY' &
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import sys

workdir = sys.argv[1]
port_file = os.path.join(workdir, "port")
seen_file = os.path.join(workdir, "seen")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        bypass = self.headers.get("x-vercel-protection-bypass") or ""
        with open(seen_file, "w", encoding="utf-8") as handle:
            handle.write("1" if bypass else "0")
        if self.path != "/api/hello":
            self.send_response(404)
            self.end_headers()
            return
        if not bypass:
            self.send_response(302)
            self.send_header(
                "Location",
                "https://vercel.com/sso-api?url=http://127.0.0.1/api/hello",
            )
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Redirecting...")
            return
        body = json.dumps({"message": "Hello, world!"}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


server = HTTPServer(("127.0.0.1", 0), Handler)
with open(port_file, "w", encoding="utf-8") as handle:
    handle.write(str(server.server_address[1]))
server.serve_forever()
PY
SERVER_PID=$!

for _i in $(seq 1 50); do
	if [ -f "$WORKDIR/port" ]; then
		break
	fi
	sleep 0.05
done
PORT=$(cat "$WORKDIR/port")
BASE_URL="http://127.0.0.1:${PORT}"

_log=$(mktemp)
if HELLO_ALLOW_HTTP=1 sh "$SCRIPT_DIR/check-api-hello.sh" "$BASE_URL" >"$_log" 2>&1; then
	fail "SSO without bypass exits non-zero"
else
	expect_fail_contains "SSO without bypass names the secret" "Add repository secret VERCEL_AUTOMATION_BYPASS_SECRET" "$_log"
	expect_fail_contains "SSO without bypass lists aliases" "VERCEL_PROTECTION_BYPASS_SECRET" "$_log"
fi

FAKE_SECRET='local-test-bypass-secret-do-not-log'
_log=$(mktemp)
if HELLO_ALLOW_HTTP=1 VERCEL_BYPASS_SECRET=$FAKE_SECRET \
	sh "$SCRIPT_DIR/check-api-hello.sh" "$BASE_URL" >"$_log" 2>&1; then
	expect_fail_contains "alias bypass reaches hello JSON" '"message": "Hello, world!"' "$_log"
	expect_omits "does not print alias bypass secret" "$FAKE_SECRET" "$_log"
	if [ "$(cat "$WORKDIR/seen")" = "1" ]; then
		ok "mock received x-vercel-protection-bypass"
	else
		fail "mock received x-vercel-protection-bypass"
	fi
else
	fail "alias bypass smoke test"
	expect_omits "does not print alias bypass secret on failure" "$FAKE_SECRET" "$_log"
fi

if [ "$FAILED" -ne 0 ]; then
	printf '%s\n' "$FAILED/$RAN check-api-hello tests failed"
	exit 1
fi

printf '%s\n' "$RAN check-api-hello tests passed"
