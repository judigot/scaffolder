#!/bin/bash
#
# Manual API Test Script for Local Repo Endpoints
#
# Prerequisites:
#   1. Server running: bun dev
#   2. Auth token from browser DevTools (Network tab > any API call > Authorization header)
#
# Usage:
#   ./scripts/test-local-repo-api.sh <bearer-token> [repo-path]
#
# Example:
#   ./scripts/test-local-repo-api.sh "eyJhbGciOiJSUzI1NiIsIn..." "/home/ubuntu/scaffolder-workspaces/judigot/ide"
#

set -e

TOKEN="$1"
REPO_PATH="${2:-/home/ubuntu/scaffolder-workspaces/judigot/ide}"
BASE_URL="${3:-http://localhost:3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Error: Bearer token required${NC}"
  echo ""
  echo "Usage: $0 <bearer-token> [repo-path]"
  echo ""
  echo "Get token from browser DevTools:"
  echo "  1. Open http://localhost:3000"
  echo "  2. Open DevTools > Network tab"
  echo "  3. Make any API call (e.g., add a repo)"
  echo "  4. Copy the Authorization header value (without 'Bearer ')"
  exit 1
fi

echo "========================================"
echo "Local Repo API Tests"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Repo Path: $REPO_PATH"
echo ""

# Helper function to make API calls
api_call() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  
  curl -s -X "$method" "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data"
}

# Test 1: Status Info
echo -e "${YELLOW}Test 1: GET Status Info${NC}"
echo "POST /api/local-repo/status-info"
RESULT=$(api_call POST "/api/local-repo/status-info" "{\"repoPath\": \"$REPO_PATH\"}")
echo "$RESULT" | jq . 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi
echo ""

# Test 2: Fetch
echo -e "${YELLOW}Test 2: Fetch${NC}"
echo "POST /api/local-repo/fetch"
RESULT=$(api_call POST "/api/local-repo/fetch" "{\"repoPath\": \"$REPO_PATH\"}")
echo "$RESULT" | jq . 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi
echo ""

# Test 3: Pull
echo -e "${YELLOW}Test 3: Pull${NC}"
echo "POST /api/local-repo/pull"
RESULT=$(api_call POST "/api/local-repo/pull" "{\"repoPath\": \"$REPO_PATH\"}")
echo "$RESULT" | jq . 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | jq -e '.ok == true' > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi
echo ""

# Test 4: Delete without confirm (should fail)
echo -e "${YELLOW}Test 4: Delete without confirm (should fail)${NC}"
echo "POST /api/local-repo/delete (no confirm)"
RESULT=$(api_call POST "/api/local-repo/delete" "{\"repoPath\": \"$REPO_PATH\"}")
echo "$RESULT" | jq . 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${GREEN}PASS (correctly rejected)${NC}"
else
  echo -e "${RED}FAIL (should have been rejected)${NC}"
fi
echo ""

# Test 5: Delete with confirm (destructive - optional)
echo -e "${YELLOW}Test 5: Delete with confirm (DESTRUCTIVE - skipped by default)${NC}"
echo "To run: Uncomment the lines below in the script"
# echo "POST /api/local-repo/delete (with confirm)"
# RESULT=$(api_call POST "/api/local-repo/delete" "{\"repoPath\": \"$REPO_PATH\", \"confirm\": true}")
# echo "$RESULT" | jq . 2>/dev/null || echo "$RESULT"
# if echo "$RESULT" | jq -e '.ok == true' > /dev/null 2>&1; then
#   echo -e "${GREEN}PASS${NC}"
# else
#   echo -e "${RED}FAIL${NC}"
# fi
echo ""

echo "========================================"
echo "Tests complete"
echo "========================================"
