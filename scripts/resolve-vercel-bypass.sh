#!/bin/sh
# Source this file, then call resolve_automation_bypass.
# Prints the bypass secret to stdout (never logs it). Exit 0 if found.
# Candidate GitHub secret names, first non-empty wins:
#   VERCEL_AUTOMATION_BYPASS_SECRET (canonical)
#   VERCEL_PROTECTION_BYPASS_SECRET
#   VERCEL_PROTECTION_BYPASS
#   VERCEL_BYPASS_SECRET
#   PROTECTION_BYPASS_SECRET
#   VERCEL_AUTOMATION_BYPASS
# If none are set and VERCEL_TOKEN is set, read Protection Bypass for
# Automation from the Vercel project API. Never print token or secret values.

VERCEL_BYPASS_ALIAS_NAMES='VERCEL_AUTOMATION_BYPASS_SECRET VERCEL_PROTECTION_BYPASS_SECRET VERCEL_PROTECTION_BYPASS VERCEL_BYPASS_SECRET PROTECTION_BYPASS_SECRET VERCEL_AUTOMATION_BYPASS'

resolve_bypass_from_aliases() {
	_name=
	_val=
	for _name in $VERCEL_BYPASS_ALIAS_NAMES; do
		eval "_val=\${$_name-}"
		if [ -n "$_val" ]; then
			printf '%s' "$_val"
			return 0
		fi
	done
	return 1
}

fetch_bypass_from_vercel_api() {
	_host=${1-}
	if [ -z "${VERCEL_TOKEN-}" ]; then
		return 1
	fi
	python3 - "$_host" <<'PY'
import json
import os
import re
import sys
import urllib.error
import urllib.request

token = os.environ.get("VERCEL_TOKEN") or ""
if not token:
    sys.exit(1)

host = sys.argv[1] if len(sys.argv) > 1 else ""
team = os.environ.get("VERCEL_ORG_ID") or os.environ.get("VERCEL_TEAM_ID") or ""
project = os.environ.get("VERCEL_PROJECT_ID") or ""


def get(url):
    request = urllib.request.Request(
        url, headers={"Authorization": "Bearer " + token}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return None


def with_team(url):
    if not team:
        return url
    return url + ("&" if "?" in url else "?") + "teamId=" + team


if host.endswith(".vercel.app"):
    name = host[: -len(".vercel.app")]
    match = re.match(r"^(.+)-([a-z0-9]{8,12})-(.+)$", name)
    if match:
        if not project:
            project = match.group(1)
        if not team:
            team = match.group(3)

if not project and host:
    deployment = get(with_team("https://api.vercel.com/v13/deployments/" + host))
    if isinstance(deployment, dict):
        project = deployment.get("projectId") or project
        team = deployment.get("teamId") or team

if not project:
    sys.exit(1)

data = get(with_team("https://api.vercel.com/v9/projects/" + project))
if not isinstance(data, dict):
    sys.exit(1)

bypass = data.get("protectionBypass") or {}
if not isinstance(bypass, dict) or not bypass:
    sys.exit(1)

sys.stdout.write(next(iter(bypass)))
PY
}

resolve_automation_bypass() {
	_host=${1-}
	if resolve_bypass_from_aliases; then
		return 0
	fi
	if [ -n "${VERCEL_TOKEN-}" ]; then
		if fetch_bypass_from_vercel_api "$_host"; then
			return 0
		fi
		printf '%s\n' "VERCEL_TOKEN is set but the Vercel API did not return a Protection Bypass for Automation secret. Add repository secret VERCEL_AUTOMATION_BYPASS_SECRET from the project's Settings → Deployment Protection." >&2
	fi
	return 1
}
