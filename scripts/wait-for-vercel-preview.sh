#!/bin/sh
# Resolve the READY Vercel preview deployment for the current commit.
# The GitHub-hosted Ubuntu runner provides curl and jq.

set -eu

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${EXPECTED_SHA:?EXPECTED_SHA is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

POLL_SECONDS=${VERCEL_PREVIEW_POLL_SECONDS:-10}
TIMEOUT_SECONDS=${VERCEL_PREVIEW_TIMEOUT_SECONDS:-600}
STARTED_AT=$(date +%s)
LAST_ERROR='no matching deployment yet'

github_preview_url() {
	_checks_url="https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${EXPECTED_SHA}/check-runs?per_page=100"
	_checks=$(curl --fail --silent --show-error --max-time 30 \
		-H "Authorization: Bearer ${GITHUB_TOKEN}" \
		-H 'Accept: application/vnd.github+json' \
		"$_checks_url" 2>/dev/null || true)
	if [ -z "$_checks" ]; then
		return 1
	fi
	printf '%s' "$_checks" | jq -r '
		[.check_runs[]? | select(.name == "Vercel Preview Comments" and
		 (.head_sha // "") == $sha and
		 .status == "completed" and .conclusion == "success" and
		 ((.app.slug // "") | ascii_downcase) == "vercel") |
		 (.output.summary // "") | scan("[A-Za-z0-9-]+\\.vercel\\.app") |
		 select(test("^[A-Za-z0-9-]+\\.vercel\\.app$"))]
		| first // empty' --arg sha "$EXPECTED_SHA" 2>/dev/null || true
}

github_deployment_status() {
	_statuses=$(curl --fail --silent --show-error --max-time 30 \
		-H "Authorization: Bearer ${GITHUB_TOKEN}" \
		-H 'Accept: application/vnd.github+json' \
		"https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${EXPECTED_SHA}/statuses" 2>/dev/null || true)
	if [ -z "$_statuses" ] || ! printf '%s' "$_statuses" | jq -e . >/dev/null 2>&1; then
		LAST_ERROR='GitHub status API unavailable or invalid JSON'
		return 1
	fi
	_status=$(printf '%s' "$_statuses" | jq -r '[.[]? | select((.context // "") == "Vercel") | select((.creator.login // "") | ascii_downcase == "vercel[bot]")] | first // {} | .state // empty')
	case "$_status" in
	success) return 0 ;;
	pending) LAST_ERROR='Vercel deployment is pending'; return 1 ;;
	failure|error) printf '%s\n' "Vercel deployment status is $_status" >&2; exit 1 ;;
	*) LAST_ERROR='no successful Vercel deployment status yet'; return 1 ;;
	esac
}

verify_preview() {
	_host=$1
	printf '%s' "$_host" | jq -Re 'test("^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\\.vercel\\.app$")' >/dev/null || return 1
	_headers=$(mktemp)
	_status=$(curl --silent --show-error --max-time 30 --max-redirs 0 -D "$_headers" -o /dev/null -w '%{http_code}' "https://${_host}/api/hello" 2>/dev/null || true)
	_build_sha=$(awk 'tolower($1)=="x-vercel-build-sha:" {print $2; exit}' "$_headers" | tr -d '\r')
	rm -f "$_headers"
	[ "$_status" = 200 ] && [ "$_build_sha" = "$EXPECTED_SHA" ]
}

while :; do
	NOW=$(date +%s)
	if [ $((NOW - STARTED_AT)) -ge "$TIMEOUT_SECONDS" ]; then
		printf '%s\n' "Vercel preview lookup failed: timed out after ${TIMEOUT_SECONDS}s (${LAST_ERROR})" >&2
		exit 1
	fi

	if ! github_deployment_status; then
		printf '%s\n' "Waiting for Vercel preview (${LAST_ERROR})"
		sleep "$POLL_SECONDS"
		continue
	fi
	PREVIEW_HOST=$(github_preview_url || true)
	PREVIEW_URL=""
	if [ -n "$PREVIEW_HOST" ]; then
		PREVIEW_URL="https://${PREVIEW_HOST}"
	fi
	if [ -n "$PREVIEW_URL" ]; then
		if verify_preview "$PREVIEW_HOST"; then
			SHORT_SHA=$(printf '%s' "$EXPECTED_SHA" | cut -c1-12)
			printf '%s\n' "Found verified Vercel preview for ${SHORT_SHA}"
			printf 'deployment_url=%s\n' "$PREVIEW_URL" >> "$GITHUB_OUTPUT"
			exit 0
		fi
		LAST_ERROR='alias is stale or build SHA does not match'
	fi

	printf '%s\n' "Waiting for Vercel preview (${LAST_ERROR})"
	sleep "$POLL_SECONDS"
done
