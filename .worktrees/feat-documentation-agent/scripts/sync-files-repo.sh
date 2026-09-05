#!/bin/sh

readonly PROJECT_DIRECTORY=$(cd "$(dirname "$0")/.." || exit 1; pwd)
readonly FILES_DIRECTORY="$PROJECT_DIRECTORY/files"
readonly REMOTE_REPO_URL="git@github.com:judigot/scaffolder-files.git"
readonly REPO_DIR="$HOME/.scaffolder-files"

sync_files_to_repo() {
    cd "$PROJECT_DIRECTORY" || exit 1
    
    if [ ! -d "$FILES_DIRECTORY" ]; then
        printf '%s\n' "Error: files directory not found at $FILES_DIRECTORY" >&2
        exit 1
    fi
    
    if [ ! -d "$REPO_DIR" ]; then
        printf '%s\n' "Cloning scaffolder-files repository..."
        git clone "$REMOTE_REPO_URL" "$REPO_DIR" >/dev/null 2>&1 || exit 1
    else
        printf '%s\n' "Updating scaffolder-files repository..."
        cd "$REPO_DIR" || exit 1
        git fetch origin >/dev/null 2>&1
        if git show-ref --verify --quiet refs/remotes/origin/main; then
            git reset --hard origin/main >/dev/null 2>&1
        elif git show-ref --verify --quiet refs/remotes/origin/master; then
            git reset --hard origin/master >/dev/null 2>&1
        fi
    fi
    
    cd "$REPO_DIR" || exit 1
    
    printf '%s\n' "Cleaning scaffolder-files repository..."
    ls -A | while IFS= read -r item; do
        if [ "$item" != ".git" ]; then
            rm -rf "$item"
        fi
    done
    
    printf '%s\n' "Copying local files to scaffolder-files repository..."
    cp -r "$FILES_DIRECTORY"/* . 2>/dev/null || {
        printf '%s\n' "Error: Failed to copy files" >&2
        exit 1
    }
    
    git add -A >/dev/null 2>&1
    
    if git diff --cached --quiet; then
        printf '%s\n' "No changes to commit"
        return 0
    fi
    
    printf '%s\n' "Committing changes..."
    git commit -m "Sync files directory from scaffolder" >/dev/null 2>&1 || {
        printf '%s\n' "Error: Failed to commit changes" >&2
        exit 1
    }
    
    printf '%s\n' "Pushing to remote..."
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    git push origin "$current_branch" >/dev/null 2>&1 || {
        printf '%s\n' "Error: Failed to push changes. Make sure you have push access." >&2
        exit 1
    }
    
    printf '%s\n' "Successfully synced files directory to repository"
}

main() {
    sync_files_to_repo
}

main "$@"

