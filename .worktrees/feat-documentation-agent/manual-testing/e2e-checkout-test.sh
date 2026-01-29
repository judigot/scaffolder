#!/bin/bash
# E2E Test: Chat Branch Checkout
# Usage: ./manual-testing/e2e-checkout-test.sh <AUTH_TOKEN>

set -e

TOKEN="${1:-$TEST_AUTH_TOKEN}"
API="http://localhost:3000"
REPO="/home/ubuntu/scaffolder-workspaces/judigot/ide"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }

echo "=== E2E Test: Chat Branch Checkout ==="
echo ""

# Check prerequisites
echo "1. Checking prerequisites..."
curl -s "$API/api/opencode/health" | grep -q "connected" || fail "OpenCode not running"
pass "OpenCode running"

if [ -z "$TOKEN" ]; then
    echo ""
    echo "⚠️  No auth token provided."
    echo "   Get token from browser DevTools > Network > any API call > Authorization header"
    echo "   Run: ./manual-testing/e2e-checkout-test.sh <TOKEN>"
    exit 1
fi

# Reset repo
echo ""
echo "2. Resetting test repository..."
cd "$REPO"
git checkout main 2>/dev/null
git branch | grep -v main | xargs -r git branch -D 2>/dev/null || true
git clean -fd 2>/dev/null
pass "Repository reset to main"

# Create test branches
echo ""
echo "3. Creating test branches..."
git checkout -b feat/test-file1
echo "Content of file 1" > test-file1.txt
git add . && git commit -m "Add test-file1.txt"
pass "Created feat/test-file1 with test-file1.txt"

git checkout main
git checkout -b feat/test-file2
echo "Content of file 2" > test-file2.txt
git add . && git commit -m "Add test-file2.txt"
pass "Created feat/test-file2 with test-file2.txt"

git checkout main
pass "Back on main"

# Test checkout API
echo ""
echo "4. Testing checkout API..."

# Test checkout feat/test-file1
RESULT=$(curl -s -X POST "$API/api/local-repo/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"repoPath\": \"$REPO\", \"branch\": \"feat/test-file1\"}")

echo "$RESULT" | grep -q '"ok":true' || fail "Checkout feat/test-file1 failed: $RESULT"
[ -f "$REPO/test-file1.txt" ] || fail "test-file1.txt not found after checkout"
[ ! -f "$REPO/test-file2.txt" ] || fail "test-file2.txt should NOT exist on feat/test-file1"
pass "Checkout feat/test-file1 - correct files"

# Test checkout feat/test-file2
RESULT=$(curl -s -X POST "$API/api/local-repo/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"repoPath\": \"$REPO\", \"branch\": \"feat/test-file2\"}")

echo "$RESULT" | grep -q '"ok":true' || fail "Checkout feat/test-file2 failed: $RESULT"
[ -f "$REPO/test-file2.txt" ] || fail "test-file2.txt not found after checkout"
[ ! -f "$REPO/test-file1.txt" ] || fail "test-file1.txt should NOT exist on feat/test-file2"
pass "Checkout feat/test-file2 - correct files"

# Switch back to file1
RESULT=$(curl -s -X POST "$API/api/local-repo/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"repoPath\": \"$REPO\", \"branch\": \"feat/test-file1\"}")

echo "$RESULT" | grep -q '"ok":true' || fail "Checkout back to feat/test-file1 failed"
[ -f "$REPO/test-file1.txt" ] || fail "test-file1.txt not found after switching back"
pass "Switch back to feat/test-file1 - correct files"

# Cleanup
echo ""
echo "5. Cleaning up..."
cd "$REPO"
git checkout main
git branch -D feat/test-file1 feat/test-file2 2>/dev/null || true
git clean -fd
pass "Cleanup complete"

echo ""
echo "==================================="
echo -e "${GREEN}All E2E tests passed!${NC}"
echo "==================================="
