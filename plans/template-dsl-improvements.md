# Template DSL Improvements

## Context

The scaffolder uses a custom DSL for templates with two syntaxes:

- `@LOOP(tables)` - file-level iteration
- `<@@LOOP@@ data="columnsInfo">` - inline iteration

We've had bugs with unbalanced tags causing silent failures. A validation layer was added to catch these at runtime.

## Completed

- [x] Add `validateHtmlTemplateTags()` function to catch unbalanced tags
- [x] Throw errors instead of silently failing in `processHtmlIf`
- [x] Fix unbalanced tags in Knex and Kysely templates
- [x] Add template linting CLI (`bun run lint:templates`) and docs

## Planned Improvements

### Quick Wins

1. **Documentation**
   - Document DSL syntax and available placeholders
   - Document loop contexts (`tables`, `columnsInfo`, `dataSources`)
   - Add examples for common patterns

### Medium Effort

3. **Multi-line Template Support**
   - Allow nested IFs to span multiple lines for readability
   - Strip whitespace during processing
   - Would make deeply nested templates maintainable

   Before:

   ```
   <@@IF@@ condition="is_primary_key EQUALS 'true'">bigserial<@@ELSE@@><@@IF@@ condition="data_type EQUALS 'number'">int8<@@ELSE@@>text</@@IF@@></@@IF@@>
   ```

   After:

   ```
   <@@IF@@ condition="is_primary_key EQUALS 'true'">
     bigserial
   <@@ELSE@@>
     <@@IF@@ condition="data_type EQUALS 'number'">
       int8
     <@@ELSE@@>
       text
     </@@IF@@>
   </@@IF@@>
   ```

   Implementation:
   - Add `trimWhitespace="true"` attribute to LOOP tags
   - Or a global template setting in structure.yaml
   - Process: collapse indentation/newlines before output

4. **Switch/Case Syntax**
   - Replace deeply nested IF/ELSE chains
   - Cleaner, more readable, less error-prone

   Syntax:

   ```
   <@@SWITCH@@ on="data_type">
     <@@CASE@@ value="number">bigInteger</@@CASE@@>
     <@@CASE@@ value="string">text</@@CASE@@>
     <@@CASE@@ value="boolean">boolean</@@CASE@@>
     <@@CASE@@ value="Date">timestamp</@@CASE@@>
     <@@DEFAULT@@>text</@@DEFAULT@@>
   </@@SWITCH@@>
   ```

   Implementation:
   - Add `findHtmlSwitchEnd()` similar to `findHtmlIfEnd()`
   - Add `processHtmlSwitch()` function
   - Parse CASE values and match against replacement variable

5. **More Conditional Operators**
   - Current: `EQUALS`, `NOT EQUAL`
   - Add: `AND`, `OR`, `IN`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`
   - Add: `>`, `<`, `>=`, `<=` for numeric comparisons

   Examples:

   ```
   <@@IF@@ condition="is_nullable EQUALS 'NO' AND is_unique EQUALS 'true'">
   <@@IF@@ condition="value IN 'created_at,updated_at,deleted_at'">
   <@@IF@@ condition="column_name STARTS_WITH 'is_'">
   ```

   Implementation:
   - Extend condition parsing regex in `processHtmlIf()`
   - Add evaluation logic for each operator

### Larger Effort

6. **Unify Syntax**
   - Problem: Two different syntaxes for same concept
     - `@LOOP(tables)` / `@/LOOP` - file-level, @ prefix
     - `<@@LOOP@@>` / `</@@LOOP@@>` - inline, HTML-like

   Options:
   A. Keep both (current) - confusing but works
   B. Migrate all to `@` syntax - cleaner, but large template rewrite
   C. Migrate all to `<@@>` syntax - consistent, verbose
   D. New unified syntax - e.g., `{{#loop tables}}...{{/loop}}`

   Migration path:
   - Add deprecation warnings for old syntax
   - Support both during transition period
   - Provide migration script

7. **Template Includes**
   - Reuse common patterns across templates
   - DRY principle for templates

   Syntax:

   ```
   <@@INCLUDE@@ file="common/nullable-check.txt" />
   <@@INCLUDE@@ file="common/timestamp-columns.txt" data="columnsInfo" />
   ```

   Implementation:
   - New `files/Projects/_shared/` directory for common templates
   - `processHtmlInclude()` function to inline file contents
   - Pass current context/replacements to included template

8. **IDE Extension (VS Code)**
   - Syntax highlighting for `.txt` template files
   - Recognize `<@@IF@@>`, `<@@LOOP@@>`, `{{placeholder}}`
   - Autocomplete for available placeholders
   - Bracket matching for template tags
   - Error squiggles for unbalanced tags

   Implementation:
   - Create VS Code extension with TextMate grammar
   - Publish to VS Code marketplace
   - Or: Create `.tmLanguage` file for manual installation

## Notes

- The DSL is tightly coupled with scaffolder-specific concepts (columnsInfo, typeMappings, etc.)
- Switching to Handlebars/EJS would require rewriting all templates and custom helpers
- Focus on incremental improvements that don't break existing templates
