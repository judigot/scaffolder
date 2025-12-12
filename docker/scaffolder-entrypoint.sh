#!/bin/bash
set -e

cd /app || exit 1

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Start supervisor
exec "$@"

