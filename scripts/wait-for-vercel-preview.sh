#!/bin/sh
# Resolve the READY Vercel preview deployment for the current commit.
# The GitHub-hosted Ubuntu runner provides curl and jq.

set -eu

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

POLL_SECONDS=${VERCEL_PREVIEW_POLL_SECONDS:-10}
TIMEOUT_SECONDS=${VERCEL_PREVIEW_TIMEOUT_SECONDS:-600}
TEAM_ID=${VERCEL_ORG_ID:-${VERCEL_TEAM_ID:-}}

API_URL="https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=preview&limit=100"
if [ -n "$TEAM_ID" ]; then
	API_URL="${API_URL}&teamId=${TEAM_ID}"
fi

STARTED_AT=$(date +%s)
LAST_ERROR='no matching deployment yet'

while :; do
	NOW=$(date +%s)
	if [ $((NOW - STARTED_AT)) -ge "$TIMEOUT_SECONDS" ]; then
		printf '%s\n' "Vercel preview lookup failed: timed out after ${TIMEOUT_SECONDS}s (${LAST_ERROR})" >&2
		exit 1
	fi

	DEPLOYMENTS=$(curl --fail --silent --show-error --max-time 30 \
		-H "Authorization: Bearer ${VERCEL_TOKEN}" \
		-H 'Accept: application/json' \
		"$API_URL" 2>/dev/null || true)

	if [ -n "$DEPLOYMENTS" ] && printf '%s' "$DEPLOYMENTS" | jq -e . >/dev/null 2>&1; then
		MATCHES=$(printf '%s' "$DEPLOYMENTS" | jq -c --arg sha "$GITHUB_SHA" '
			[.deployments[]? |
			 select(((.meta.githubCommitSha // .meta.gitSha) // "") == $sha)]
			| sort_by(.createdAt // "") | reverse
		')

		READY_URL=$(printf '%s' "$MATCHES" | jq -r '[.[] | select(.readyState == "READY") | .url // empty] | first // empty')
		if [ -n "$READY_URL" ]; then
			case "$READY_URL" in
				https://*) PREVIEW_URL=$READY_URL ;;
				*) PREVIEW_URL="https://${READY_URL}" ;;
			esac
			SHORT_SHA=$(printf '%s' "$GITHUB_SHA" | cut -c1-12)
			printf '%s\n' "Found READY Vercel preview for ${SHORT_SHA}"
			printf 'deployment_url=%s\n' "$PREVIEW_URL" >> "$GITHUB_OUTPUT"
			exit 0
		fi

		FAILED_STATE=$(printf '%s' "$MATCHES" | jq -r '[.[] | select(.readyState == "ERROR" or .readyState == "CANCELED") | .readyState] | first // empty')
		if [ -n "$FAILED_STATE" ]; then
			LAST_ERROR="matching deployment is ${FAILED_STATE}"
		fi
	else
		LAST_ERROR='Vercel API unavailable or returned invalid JSON'
	fi

	printf '%s\n' "Waiting for Vercel preview (${LAST_ERROR})"
	sleep "$POLL_SECONDS"
done
