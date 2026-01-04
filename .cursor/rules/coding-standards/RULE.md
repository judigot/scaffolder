---
description: TypeScript and React coding standards for this project
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: false
---

# Coding Standards

## TypeScript

- Use `unknown` instead of `any`
- No `as` type assertions — use type guards and narrowing
- Explicit return types for exported functions
- Discriminated unions for complex state
- Wrap variables in `String()` when interpolating
- Handle `null`, `undefined`, `0`, or `NaN` explicitly
- Always use braces for void arrow functions

## React

- Function components only
- Include all dependencies in hooks
- Small components with logic extracted into hooks
- Proper `useEffect` usage (external system sync only)
- Minimal state, derived values preferred
- Accessibility is mandatory
- Fix click handlers on non-interactive elements

## Linting Priority

1. **ESLint** (source of truth) — Follow `plugin:@typescript-eslint/strict-type-checked`
2. **Oxlint**
3. **Biome**

## Comments

- Only add useful comments
- Don't add obvious comments
- Comment like a senior-level engineer
- Don't comment on architectural decisions that are self-evident from code structure

