# Dynamic Case Transformations Plan

## Overview

Replace explicit case-variant placeholders with chainable dot-notation transformations. This eliminates combinatorial explosion and provides a more intuitive API.

## Current State (Combinatorial Explosion)

For each variable, we generate 18+ explicit placeholders:

```typescript
// In getReplacementsForTable.ts
{
  tableName: "user_profile",
  tableNamePascalCase: "UserProfile",
  tableNameCamelCase: "userProfile",
  tableNameKebabCase: "user-profile",
  tableNameSnakeCase: "user_profile",
  tableNamePlural: "user_profiles",
  tableNamePluralPascalCase: "UserProfiles",
  tableNamePluralCamelCase: "userProfiles",
  tableNamePluralKebabCase: "user-profiles",
  tableNameSingular: "user_profile",
  tableNameSingularPascalCase: "UserProfile",
  // ... and more
}
```

**Problems:**
- Maintenance burden (every new variable needs 18+ variants)
- Template files bloated with long placeholder names
- Hard to add new transformations
- Not intuitive for template authors

## Target State (Chainable Transformations)

```html
{{tableName}}                     <!-- raw: user_profile -->
{{tableName.pascalCase}}          <!-- UserProfile -->
{{tableName.camelCase}}           <!-- userProfile -->
{{tableName.kebabCase}}           <!-- user-profile -->
{{tableName.snakeCase}}           <!-- user_profile -->
{{tableName.plural}}              <!-- user_profiles -->
{{tableName.singular}}            <!-- user_profile -->
{{tableName.plural.pascalCase}}   <!-- UserProfiles -->
{{tableName.singular.kebabCase}}  <!-- user-profile -->
{{tableName.plural.titleCase}}    <!-- User Profiles -->
```

## Transformation API

### Available Transformations

| Transform | Input | Output |
|-----------|-------|--------|
| `.pascalCase` | user_profile | UserProfile |
| `.camelCase` | user_profile | userProfile |
| `.kebabCase` | user_profile | user-profile |
| `.snakeCase` | UserProfile | user_profile |
| `.titleCase` | user_profile | User Profile |
| `.sentenceCase` | user_profile | User profile |
| `.upperCase` | user_profile | USER_PROFILE |
| `.lowerCase` | UserProfile | userprofile |
| `.plural` | user | users |
| `.singular` | users | user |

### Chaining Rules

Transformations apply left-to-right:

```
{{tableName.plural.pascalCase}}
         │        │
         │        └── 2. Apply pascalCase: "UserProfiles"
         └── 1. Apply plural: "user_profiles"
```

### Implementation

```typescript
function processPlaceholder(
  placeholder: string,
  context: Record<string, string>
): string {
  const parts = placeholder.split('.');
  const variableName = parts[0];
  const transforms = parts.slice(1);

  let value = context[variableName];
  if (value === undefined) {
    return `{{${placeholder}}}`; // Keep unresolved
  }

  for (const transform of transforms) {
    value = applyTransform(value, transform);
  }

  return value;
}

function applyTransform(value: string, transform: string): string {
  switch (transform) {
    case 'pascalCase':
      return toPascalCase(value);
    case 'camelCase':
      return toCamelCase(value);
    case 'kebabCase':
      return toKebabCase(value);
    case 'snakeCase':
      return toSnakeCase(value);
    case 'plural':
      return pluralize(value);
    case 'singular':
      return pluralize.singular(value);
    case 'titleCase':
      return toTitleCase(value);
    case 'upperCase':
      return value.toUpperCase();
    case 'lowerCase':
      return value.toLowerCase();
    default:
      console.warn(`Unknown transform: ${transform}`);
      return value;
  }
}
```

## Migration Steps

### Phase 1: Implement New Parser

- [ ] Create `processPlaceholderWithTransforms()` function
- [ ] Support dot-notation parsing
- [ ] Handle chained transformations
- [ ] Add error handling for unknown transforms

### Phase 2: Update Context Generation

- [ ] Simplify `getReplacementsForTable()` to only provide base values
- [ ] Remove explicit case variants from context object
- [ ] Keep backward compatibility during transition (optional)

### Phase 3: Migrate Templates

- [ ] Update all `{{tableNamePascalCase}}` → `{{tableName.pascalCase}}`
- [ ] Update all `{{columnNameCamelCase}}` → `{{columnName.camelCase}}`
- [ ] Verify all templates work with new syntax

### Phase 4: Update Tests

- [ ] Add tests for transformation chaining
- [ ] Add tests for unknown transform handling
- [ ] Update existing placeholder tests
- [ ] Verify golden tests pass

## Files to Modify

### Core Implementation
- `src/utils/project-builder/template-processors/getReplacementsForTable.ts`
- `src/utils/project-builder/template-processors/processIterateCommand.ts`
- `src/utils/changeCase.ts` (may need refactoring)

### Templates
- All framework templates using explicit case variants

### Tests
- `src/tests/utils/project-builder/template-processors/*.test.ts`
- Add new tests for transformation chaining

## Edge Cases

### Unknown Transform
```html
{{tableName.unknownCase}}
<!-- Option 1: Return raw value with warning -->
<!-- Option 2: Keep placeholder unresolved -->
<!-- Option 3: Throw error -->
```

**Recommendation:** Return raw value + console warning (graceful degradation)

### Empty Value
```html
{{emptyField.pascalCase}}
<!-- Return empty string -->
```

### Nested Properties with Transforms
```html
{{column.foreignTable.pascalCase}}
<!-- First resolve column.foreignTable, then apply pascalCase -->
```

## Backward Compatibility (Optional)

During transition, support both syntaxes:

```html
{{tableNamePascalCase}}    <!-- Legacy: still works -->
{{tableName.pascalCase}}   <!-- New: preferred -->
```

After migration complete, remove legacy support.

## Success Criteria

- [ ] All templates use dot-notation transformations
- [ ] No explicit case variants in context objects
- [ ] All tests passing
- [ ] Golden tests generate valid projects
- [ ] Template authoring is simpler and more intuitive
