#!/bin/bash

# Test GitHub Actions CI locally using act
# Requires: docker, act (https://github.com/nektos/act)
#
# Usage: ./scripts/test-ci.sh [app-name]
# Default: hono-react

set -e

APP_NAME="${1:-hono-react}"
APP_DIR=".apps/$APP_NAME"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# Check prerequisites
command -v docker &> /dev/null || log_error "docker is required but not installed"
command -v act &> /dev/null || log_error "act is required. Install: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"

# Check app exists
[ -d "$APP_DIR" ] || log_error "App directory not found: $APP_DIR"
[ -f "$APP_DIR/.github/workflows/api-test.yml" ] || log_error "GitHub Actions workflow not found in $APP_DIR"

log_info "Running CI tests for $APP_NAME"
log_info "Using act with catthehacker/ubuntu:act-latest"

cd "$APP_DIR"

# Run act with the catthehacker image and bind mount for better performance
act -P ubuntu-latest=catthehacker/ubuntu:act-latest --bind

log_success "CI tests completed successfully"
