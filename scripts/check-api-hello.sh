#!/bin/sh
# Smoke-test {previewUrl}/api/hello.
# Usage: check-api-hello.sh <preview-base-url>
# Sends x-vercel-protection-bypass when a bypass secret is resolved from
# VERCEL_AUTOMATION_BYPASS_SECRET or a known alias / VERCEL_TOKEN.
# Never prints secret values.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=assert-hello-response.sh
. "$SCRIPT_DIR/assert-hello-response.sh"
# shellcheck source=resolve-vercel-bypass.sh
. "$SCRIPT_DIR/resolve-vercel-bypass.sh"

reject_production_host() {
	_host=$1
	case "$_host" in
	app-scaffolder.vercel.app | www.app-scaffolder.vercel.app)
		printf '%s\n' "Refusing production hostname $_host. This check only smoke-tests a Vercel Preview URL." >&2
		return 1
		;;
	esac
	return 0
}

extract_header() {
	_name=$1
	_file=$2
	python3 -c '
import sys

name = sys.argv[1].lower() + ":"
path = sys.argv[2]
value = ""
with open(path, "r", encoding="utf-8", errors="replace") as handle:
    for line in handle:
        stripped = line.replace("\r", "").rstrip("\n")
        if stripped.lower().startswith(name):
            value = stripped.split(":", 1)[1].strip()
            break
sys.stdout.write(value)
' "$_name" "$_file"
}

BASE_URL=${1-}
if [ -z "$BASE_URL" ]; then
	printf '%s\n' "Usage: $0 <preview-base-url>" >&2
	exit 2
fi

case "$BASE_URL" in
https://*)
	;;
http://127.0.0.1:* | http://localhost:*)
	if [ "${HELLO_ALLOW_HTTP-}" != "1" ]; then
		printf '%s\n' "Preview URL must use https:// (got a non-https value)." >&2
		exit 1
	fi
	;;
*)
	printf '%s\n' "Preview URL must use https:// (got a non-https value)." >&2
	exit 1
	;;
esac

BASE_URL=${BASE_URL%/}
HOST=${BASE_URL#https://}
HOST=${HOST#http://}
HOST=${HOST%%/*}
reject_production_host "$HOST" || exit 1

HELLO_URL="${BASE_URL}/api/hello"
HEADER_FILE=$(mktemp)
BODY_FILE=$(mktemp)
trap 'rm -f "$HEADER_FILE" "$BODY_FILE"' EXIT

RESOLVED_BYPASS=
if RESOLVED_BYPASS=$(resolve_automation_bypass "$HOST"); then
	:
else
	RESOLVED_BYPASS=
fi

set -- curl -sS --max-redirs 0 -D "$HEADER_FILE" -o "$BODY_FILE" -w '%{http_code}'
HELLO_BYPASS_PRESENT=0
if [ -n "$RESOLVED_BYPASS" ]; then
	HELLO_BYPASS_PRESENT=1
	set -- "$@" \
		-H "x-vercel-protection-bypass: ${RESOLVED_BYPASS}" \
		-H "x-vercel-set-bypass-cookie: true"
fi
set -- "$@" "$HELLO_URL"

printf '%s\n' "GET ${HELLO_URL}"
if [ "$HELLO_BYPASS_PRESENT" -eq 1 ]; then
	printf '%s\n' "Sending x-vercel-protection-bypass (value redacted)"
else
	printf '%s\n' "No protection-bypass secret resolved. Looked for repository secrets: VERCEL_AUTOMATION_BYPASS_SECRET, VERCEL_PROTECTION_BYPASS_SECRET, VERCEL_PROTECTION_BYPASS, VERCEL_BYPASS_SECRET, PROTECTION_BYPASS_SECRET, VERCEL_AUTOMATION_BYPASS, and VERCEL_TOKEN."
fi

CURL_STATUS=0
HTTP_STATUS=$("$@") || CURL_STATUS=$?
if [ "$CURL_STATUS" -ne 0 ] && [ -z "$HTTP_STATUS" ]; then
	printf '%s\n' "curl failed with exit ${CURL_STATUS}" >&2
	exit 1
fi

HELLO_HTTP_STATUS=$HTTP_STATUS
HELLO_BODY=$(cat "$BODY_FILE")
HELLO_LOCATION=$(extract_header Location "$HEADER_FILE")
HELLO_CONTENT_TYPE=$(extract_header Content-Type "$HEADER_FILE")
export HELLO_HTTP_STATUS HELLO_BODY HELLO_LOCATION HELLO_CONTENT_TYPE HELLO_BYPASS_PRESENT

assert_hello_response
printf '%s\n' "$HELLO_BODY"
