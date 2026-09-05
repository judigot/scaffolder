#!/bin/sh

readonly PROJECT_DIRECTORY=$(cd "$(dirname "$0")" || exit 1; pwd)
readonly OXLINT_TARGET="${PROJECT_DIRECTORY}/.oxlintrc.json.migrated"
readonly BIOME_TARGET="${PROJECT_DIRECTORY}/biome.json.migrated"
readonly BIOME_ORIGINAL="${PROJECT_DIRECTORY}/biome.json"
readonly BIOME_TEMP="${PROJECT_DIRECTORY}/.biome.json.tmp"

main() {
    run_oxlint_migration
    run_biome_migration
    replace_patterns
}

run_oxlint_migration() {
    cd "$PROJECT_DIRECTORY" || exit 1
    
    printf '%s\n' "Running oxlint migration..."
    bunx @oxlint/migrate --type-aware --with-nursery --output-file .oxlintrc.json.migrated
    
    if [ $? -ne 0 ]; then
        printf '%s\n' "Error: oxlint migration failed" >&2
        exit 1
    fi
    
    if [ ! -f "$OXLINT_TARGET" ]; then
        printf '%s\n' "Error: Migration did not create $OXLINT_TARGET" >&2
        exit 1
    fi
    
    printf '%s\n' "oxlint migration completed successfully"
}

run_biome_migration() {
    cd "$PROJECT_DIRECTORY" || exit 1
    
    if [ ! -f "$BIOME_ORIGINAL" ]; then
        printf '%s\n' "Warning: biome.json not found, skipping biome migration" >&2
        return 0
    fi
    
    cp "$BIOME_ORIGINAL" "$BIOME_TEMP"
    
    if [ $? -ne 0 ]; then
        printf '%s\n' "Error: Failed to backup biome.json" >&2
        exit 1
    fi
    
    printf '%s\n' "Running biome migration..."
    bunx --bun biome migrate eslint --write > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        printf '%s\n' "Error: biome migration failed" >&2
        mv "$BIOME_TEMP" "$BIOME_ORIGINAL"
        exit 1
    fi
    
    if [ -f "$BIOME_ORIGINAL" ]; then
        mv "$BIOME_ORIGINAL" "$BIOME_TARGET"
    fi
    
    mv "$BIOME_TEMP" "$BIOME_ORIGINAL"
    
    if [ ! -f "$BIOME_TARGET" ]; then
        printf '%s\n' "Warning: Migration may not have created $BIOME_TARGET" >&2
    else
        printf '%s\n' "biome migration completed successfully"
    fi
}

replace_patterns() {
    replace_pattern_in_file "$OXLINT_TARGET" "files"
    replace_pattern_in_file "$BIOME_TARGET" "includes"
}

replace_pattern_in_file() {
    target_file="$1"
    array_key="$2"
    
    if [ ! -f "$target_file" ]; then
        return 0
    fi
    
    cd "$PROJECT_DIRECTORY" || exit 1

    awk -v array_key="$array_key" '
    BEGIN {
        in_array = 0
        indent = ""
        nested_depth = 0
        has_nested_arrays = 0
    }
    
    {
        pattern = "^\\s*\"" array_key "\":\\s*\\[\\s*$"
        if (in_array == 0 && $0 ~ pattern) {
            in_array = 1
            match($0, /^(\s*)/)
            indent = substr($0, 1, RLENGTH)
            nested_depth = 0
            has_nested_arrays = 0
            next
        }
        
        if (in_array == 1) {
            if (/^\s*\[\s*$/) {
                nested_depth++
                has_nested_arrays = 1
                next
            }
            
            if (/^\s*"\*\*\/\*\.\{ts,tsx\}",?\s*$/) {
                next
            }
            
            if (/^\s*"\*\*\/\*\.ts",?\s*$/) {
                next
            }
            
            if (/^\s*"\*\*\/\*\.tsx",?\s*$/) {
                next
            }
            
            if (/^\s*"\*\*\/\*\.mts",?\s*$/) {
                next
            }
            
            if (/^\s*"\*\*\/\*\.cts",?\s*$/) {
                next
            }
            
            if (/^\s*\],?\s*$/) {
                if (nested_depth > 0) {
                    nested_depth--
                    next
                }
                
                if (nested_depth == 0) {
                    if (has_nested_arrays == 1) {
                        printf "%s\"%s\": [\n", indent, array_key
                        printf "%s  \"**/*.{ts,tsx}\"\n", indent
                        printf "%s],\n", indent
                    } else {
                        printf "%s\"%s\": [\n", indent, array_key
                        printf "%s  \"**/*.{ts,tsx}\"\n", indent
                        printf "%s],\n", indent
                    }
                    in_array = 0
                    nested_depth = 0
                    has_nested_arrays = 0
                    indent = ""
                    next
                }
            }
            
            next
        }
        
        print
    }
    ' "$target_file" > "${target_file}.tmp"
    
    if [ $? -ne 0 ]; then
        printf '%s\n' "Error: Failed to process $target_file" >&2
        [ -f "${target_file}.tmp" ] && rm -f "${target_file}.tmp"
        exit 1
    fi
    
    if [ -f "${target_file}.tmp" ] && ! diff -q "$target_file" "${target_file}.tmp" > /dev/null 2>&1; then
        mv "${target_file}.tmp" "$target_file"
        normalized_path=$(printf '%s\n' "$target_file" | sed 's|\\|/|g')
        printf '\033[1;32m✓\033[0m Successfully simplified nested %s arrays in %s\n' "$array_key" "$normalized_path"
    else
        [ -f "${target_file}.tmp" ] && rm -f "${target_file}.tmp"
        normalized_path=$(printf '%s\n' "$target_file" | sed 's|\\|/|g')
        printf '\033[1;33m⊘\033[0m No nested %s patterns found in %s\n' "$array_key" "$normalized_path"
    fi
}

main "$@"

