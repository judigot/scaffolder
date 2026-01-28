#!/bin/bash

# Quick Test Script for Chat Branch Checkout + Remote Agent
# Usage: ./manual-testing/quick-test.sh

set -e

echo "🧪 Chat Branch Checkout + Remote Agent - Quick Test"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check OpenCode
if curl -s http://localhost:4096/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} OpenCode running on port 4096"
else
    echo -e "${RED}✗${NC} OpenCode not running"
    echo "   Start with: opencode serve --port 4096"
    exit 1
fi

# Check Backend
if curl -s http://localhost:3000/api/opencode/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend running on port 3000"
else
    echo -e "${RED}✗${NC} Backend not running"
    echo "   Start with: bun dev"
    exit 1
fi

# Check workspace directory
if [ -d "/home/ubuntu/scaffolder-workspaces" ]; then
    echo -e "${GREEN}✓${NC} Workspace directory exists"
    REPO_COUNT=$(find /home/ubuntu/scaffolder-workspaces -mindepth 2 -maxdepth 2 -type d | wc -l)
    echo "   Found $REPO_COUNT cloned repositories"
else
    echo -e "${YELLOW}⚠${NC} Workspace directory not found"
    echo "   Will be created when you clone first repo"
fi

echo ""
echo "=================================================="
echo ""

# Interactive testing menu
while true; do
    echo "Select a test to run:"
    echo "1) Verify OpenCode connection"
    echo "2) Check available repositories"
    echo "3) Create test repository (clone judigot/test-repo)"
    echo "4) View test guide in browser"
    echo "5) Run end-to-end smoke test"
    echo "6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice

    case $choice in
        1)
            echo ""
            echo "Testing OpenCode connection..."
            RESPONSE=$(curl -s http://localhost:3000/api/opencode/health)
            echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
            echo ""
            ;;
        2)
            echo ""
            echo "Checking cloned repositories..."
            if [ -d "/home/ubuntu/scaffolder-workspaces" ]; then
                find /home/ubuntu/scaffolder-workspaces -mindepth 2 -maxdepth 2 -type d -exec bash -c '
                    DIR="$1"
                    if [ -d "$DIR/.git" ]; then
                        echo "📁 $(basename $(dirname "$DIR"))/$(basename "$DIR")"
                        cd "$DIR"
                        BRANCH=$(git branch --show-current)
                        echo "   Branch: $BRANCH"
                        STATUS=$(git status --porcelain | wc -l)
                        if [ "$STATUS" -eq 0 ]; then
                            echo "   Status: Clean ✓"
                        else
                            echo "   Status: $STATUS files modified"
                        fi
                        echo ""
                    fi
                ' _ {} \;
            else
                echo "No repositories found. Clone one from the UI first."
            fi
            echo ""
            ;;
        3)
            echo ""
            echo "Creating test repository..."
            echo "This will clone judigot/test-repo to workspace"
            echo ""
            echo "Steps:"
            echo "1. Open http://localhost:3000 in your browser"
            echo "2. Click 'Repositories' tab"
            echo "3. Click '+ Add' button"
            echo "4. Enter: judigot/test-repo"
            echo "5. Click 'Add Repository'"
            echo ""
            read -p "Press Enter when done..."
            ;;
        4)
            echo ""
            echo "Opening test guide..."
            if command -v xdg-open > /dev/null; then
                xdg-open "manual-testing/test-chat-branch-checkout.md"
            elif command -v open > /dev/null; then
                open "manual-testing/test-chat-branch-checkout.md"
            else
                echo "Please open this file manually:"
                echo "manual-testing/test-chat-branch-checkout.md"
            fi
            echo ""
            ;;
        5)
            echo ""
            echo "🚀 Running end-to-end smoke test..."
            echo ""
            
            # Test 1: OpenCode health
            echo "Test 1: OpenCode health check"
            if curl -s http://localhost:3000/api/opencode/health | grep -q "connected"; then
                echo -e "${GREEN}✓ PASS${NC}"
            else
                echo -e "${RED}✗ FAIL${NC}"
            fi
            
            # Test 2: Check if repos exist
            echo "Test 2: Repository availability"
            if [ -d "/home/ubuntu/scaffolder-workspaces" ] && [ "$(find /home/ubuntu/scaffolder-workspaces -mindepth 2 -maxdepth 2 -type d | wc -l)" -gt 0 ]; then
                echo -e "${GREEN}✓ PASS${NC} - Repositories available"
            else
                echo -e "${YELLOW}⚠ SKIP${NC} - No repositories cloned yet"
            fi
            
            # Test 3: Frontend running
            echo "Test 3: Frontend accessibility"
            if curl -s http://localhost:3000 | grep -q "<!doctype html"; then
                echo -e "${GREEN}✓ PASS${NC}"
            else
                echo -e "${RED}✗ FAIL${NC}"
            fi
            
            echo ""
            echo "Smoke test complete!"
            echo ""
            echo "Next steps:"
            echo "1. Open http://localhost:3000 in your browser"
            echo "2. Follow the manual test guide:"
            echo "   manual-testing/test-chat-branch-checkout.md"
            echo ""
            ;;
        6)
            echo ""
            echo "Testing session ended. Good luck! 🎉"
            echo ""
            exit 0
            ;;
        *)
            echo "Invalid choice. Please select 1-6."
            ;;
    esac
done
