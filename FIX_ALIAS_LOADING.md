# Fix Alias Loading in MSYS2 Terminal

## Problem Analysis

Aliases are not loading when opening MSYS2 terminal in Cursor/VSCode via `Bash.bat`. The root causes are:

1. **Missing alias expansion**: Aliases are disabled by default in non-interactive shells (`bash -c`). Need `shopt -s expand_aliases` before loading aliases.

2. **ALIAS file not being loaded**: The `.snippetsrc` file defines functions and inline aliases, but does NOT load aliases from the `ALIAS` file which uses a different format (function names followed by alias mappings).

3. **Path resolution issues**: The `$HOME` variable may be set incorrectly (e.g., `C:UsersJude` instead of `/c/Users/Jude`), causing the ALIAS file path to fail.

4. **No function to load ALIAS file**: There's no `loadAliasFile()` function or call to it in `.snippetsrc`.

## Current File Structure

- **`.bashrc`**: Sources `.snippetsrc` but doesn't load aliases directly
- **`.snippetsrc`**: Defines functions and inline aliases, but doesn't load from `ALIAS` file
- **`ALIAS`**: Contains alias mappings in format:
  ```
  functionName:
  alias1
  alias2
  ```
- **`Bash.bat`**: Launches bash with `--login -i -c "source '%BASH_ENV%'; exec bash"`

## Solution Requirements

1. Add `loadAliasFile()` function to `.snippetsrc` that:
   - Enables `shopt -s expand_aliases`
   - Reads the `ALIAS` file
   - Parses the format (function name followed by aliases)
   - Creates aliases using `alias` command
   - Handles path resolution with fallbacks: `$HOME/ALIAS`, `/c/Users/$USER/ALIAS`, `/c/Users/$USERNAME/ALIAS`

2. Call `loadAliasFile()` at the end of `.snippetsrc` (after all function definitions)

3. Ensure `shopt -s expand_aliases` is set before any aliases are defined

## Implementation Prompt

```
Fix the alias loading issue in MSYS2 terminal. The aliases from the ALIAS file are not being loaded.

Current situation:
- .bashrc sources .snippetsrc
- .snippetsrc defines functions and inline aliases but doesn't load from ALIAS file
- ALIAS file exists with format: functionName: followed by alias lines
- Bash.bat launches bash with: bash --login -i -c "source '%BASH_ENV%'; exec bash"

Requirements:
1. Add loadAliasFile() function to .snippetsrc that:
   - Enables shopt -s expand_aliases
   - Finds ALIAS file using fallback paths: $HOME/ALIAS, /c/Users/$USER/ALIAS, /c/Users/$USERNAME/ALIAS
   - Parses ALIAS file format (functionName: followed by alias lines)
   - Creates aliases using: alias "aliasName"="functionName"
   - Handles comments (lines starting with #) and empty lines

2. Call loadAliasFile() at the very end of .snippetsrc (after all function definitions)

3. Ensure shopt -s expand_aliases is enabled before loading aliases

4. Do NOT modify the stable versions in ~/.bashrc, ~/.snippetsrc, or ~/ALIAS
5. Work with the files in the current directory as the single source of truth

The ALIAS file format example:
```
helloWorld:
hi
hello
helloworld

apt:
apt
```

This should create: alias hi='helloWorld', alias hello='helloWorld', alias helloworld='helloWorld', alias apt='apt'
```

## Testing

After implementation, test by:
1. Opening a new MSYS2 terminal via Bash.bat
2. Running `alias` command - should show all aliases from ALIAS file
3. Testing a few aliases to ensure they work

## Notes

- Aliases must be enabled with `shopt -s expand_aliases` in non-interactive shells
- Path resolution must handle Windows path format issues
- The ALIAS file uses a different format than inline aliases in .snippetsrc
- Function definitions in .snippetsrc should remain unchanged