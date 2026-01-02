#!/bin/sh

readonly PROJECT_DIRECTORY=$(cd "$(dirname "$0")" || exit 1; pwd)
# readonly MONOREPO_DIR="${PROJECT_DIRECTORY}/.monorepo"
readonly MONOREPO_DIR="${PROJECT_DIRECTORY}/../.monorepo"

main() {
  printf '%s\n' "Setting up standalone monorepo in .monorepo directory..."
  
  copy_files
  create_root_package_json
  
  printf '%s\n' "✓ Monorepo setup complete!"
  printf '%s\n' "  Location: ${MONOREPO_DIR}"
  printf '%s\n' "  Next steps:"
  printf '%s\n' "    1. cd .monorepo"
  printf '%s\n' "    2. pnpm install"
  printf '%s\n' "    3. pnpm dev"
}

copy_files() {
  cd "$PROJECT_DIRECTORY" || exit 1
  
  # Copy root config files
  if [ -f pnpm-workspace.yaml ]; then
    cp pnpm-workspace.yaml "${MONOREPO_DIR}/"
  fi
  if [ -f turbo.json ]; then
    cp turbo.json "${MONOREPO_DIR}/"
  fi
  if [ -f .npmrc ]; then
    cp .npmrc "${MONOREPO_DIR}/"
  fi
  if [ -f tsconfig.json ]; then
    cp tsconfig.json "${MONOREPO_DIR}/"
  fi
  if [ -f tsconfig.app.json ]; then
    cp tsconfig.app.json "${MONOREPO_DIR}/"
  fi
  if [ -f tsconfig.node.json ]; then
    cp tsconfig.node.json "${MONOREPO_DIR}/"
  fi
  if [ -f eslint.config.js ]; then
    cp eslint.config.js "${MONOREPO_DIR}/"
  fi
  if [ -f .gitignore ]; then
    cp .gitignore "${MONOREPO_DIR}/"
  fi
  if [ -f README.md ]; then
    cp README.md "${MONOREPO_DIR}/"
  fi
  
  # Copy .changeset/config.json
  if [ -f .changeset/config.json ]; then
    mkdir -p "${MONOREPO_DIR}/.changeset"
    cp .changeset/config.json "${MONOREPO_DIR}/.changeset/"
  fi
  
  # Copy packages folder, excluding node_modules and build artifacts
  if [ -d packages ]; then
    (
      cd packages || exit 1
      find . -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/.turbo/*" \
        -not -path "*/coverage/*" \
        -not -name "*.tsbuildinfo" \
        | while read -r file; do
          file_path="${file#./}"
          dest_file="${MONOREPO_DIR}/packages/${file_path}"
          dest_parent=$(dirname "$dest_file")
          mkdir -p "$dest_parent"
          cp "$file" "$dest_file"
        done
    )
  fi
  
  # Copy apps folder, excluding node_modules and build artifacts
  if [ -d apps ]; then
    (
      cd apps || exit 1
      find . -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/.turbo/*" \
        -not -path "*/coverage/*" \
        -not -name "*.tsbuildinfo" \
        | while read -r file; do
          file_path="${file#./}"
          dest_file="${MONOREPO_DIR}/apps/${file_path}"
          dest_parent=$(dirname "$dest_file")
          mkdir -p "$dest_parent"
          cp "$file" "$dest_file"
        done
    )
  fi
  
  printf '%s\n' "✓ Copied all files"
}

create_root_package_json() {
  cd "$MONOREPO_DIR" || exit 1
  
  cat > package.json << 'EOF'
{
  "name": "monorepo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.9",
    "@eslint/compat": "^2.0.0",
    "@eslint/eslintrc": "^3.3.3",
    "@eslint/js": "^9.39.1",
    "@typescript-eslint/eslint-plugin": "^8.48.0",
    "@typescript-eslint/parser": "^8.48.0",
    "eslint": "^9.39.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-import-resolver-typescript": "^4.4.4",
    "eslint-plugin-import": "^2.32.0",
    "eslint-plugin-jsx-a11y": "^6.10.2",
    "eslint-plugin-no-type-assertion": "^1.3.0",
    "eslint-plugin-prettier": "^5.5.4",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "prettier": "^3.7.3",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.48.0",
    "turbo": "^2.3.3"
  }
}
EOF
  
  printf '%s\n' "✓ Created root package.json"
}

main "$@"
