#!/bin/sh
# Source this file, then call assert_hello_response.
# Required env: HELLO_HTTP_STATUS, HELLO_BODY
# Optional env: HELLO_LOCATION, HELLO_CONTENT_TYPE, HELLO_BYPASS_PRESENT (1 when a bypass secret was sent)

is_sso_challenge() {
	_status="${HELLO_HTTP_STATUS-}"
	_location="${HELLO_LOCATION-}"
	_ctype="${HELLO_CONTENT_TYPE-}"
	_body="${HELLO_BODY-}"

	case "$_location" in
	*vercel.com/sso-api* | *vercel.com/login* | *vercel.com/sso*)
		return 0
		;;
	esac

	case "$_status" in
	401 | 403)
		return 0
		;;
	302 | 303 | 307 | 308)
		case "$_location" in
		*vercel.com*)
			return 0
			;;
		esac
		;;
	esac

	case "$_ctype" in
	*[Hh][Tt][Mm][Ll]*)
		case "$_body" in
		*[Vv]ercel*[Aa]uth* | *[Aa]uthentication*[Rr]equired*)
			return 0
			;;
		esac
		;;
	esac

	case "$_body" in
	*vercel.com/sso-api* | *[Vv]ercel*[Aa]uthentication* | *[Aa]uthentication*[Rr]equired*)
		return 0
		;;
	esac

	return 1
}

assert_hello_json() {
	printf '%s' "${HELLO_BODY-}" | python3 -c '
import json
import sys

raw = sys.stdin.read()
try:
    data = json.loads(raw)
except json.JSONDecodeError as exc:
    sys.stderr.write("Response is not JSON: %s\n" % exc)
    sys.exit(1)

if data != {"message": "Hello, world!"}:
    sys.stderr.write("Unexpected JSON: %s\n" % json.dumps(data, sort_keys=True))
    sys.exit(1)
'
}

sso_fail_message() {
	if [ "${HELLO_BYPASS_PRESENT-}" = "1" ]; then
		printf '%s\n' "Vercel Authentication intercepted GET /api/hello even though x-vercel-protection-bypass was sent. Check that secrets.VERCEL_AUTOMATION_BYPASS_SECRET matches the project's Protection Bypass for Automation value."
	else
		printf '%s\n' "Vercel Authentication intercepted GET /api/hello (SSO redirect). Add repository secret VERCEL_AUTOMATION_BYPASS_SECRET and this workflow will send it as x-vercel-protection-bypass."
	fi
}

assert_hello_response() {
	if is_sso_challenge; then
		sso_fail_message >&2
		return 1
	fi

	if [ "${HELLO_HTTP_STATUS-}" != "200" ]; then
		printf '%s\n' "Expected HTTP 200 from /api/hello, got ${HELLO_HTTP_STATUS-}" >&2
		return 1
	fi

	assert_hello_json
}
