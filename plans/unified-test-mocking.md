# Unified Test Mocking Plan

## Problem

Currently, 28 tests are in `.vitest-only.{ts,tsx}` files because they use `vi.mock()` which bun's test runner doesn't support. This creates:

1. **Fragmented test suite** - Different test counts between runners (622 vs 650)
2. **Maintenance burden** - Need to remember which features work in which runner
3. **CI complexity** - Must run both `bun test` and `vitest` for full coverage

## Current State

| File | Tests | Why vitest-only |
|------|-------|-----------------|
| `runtime.vitest-only.ts` | ~20 | Uses `vi.mock()` for module mocking |
| `TerminalMode.vitest-only.tsx` | ~8 | Uses `vi.mock()` for React component mocking |

## Goal

Create a unified mocking abstraction that works with both test runners, allowing all tests to run under `bun test`.

## Research Needed

### 1. Bun's Native Mocking
```typescript
// Bun has mock.module() - check compatibility
import { mock } from 'bun:test';
mock.module('./path', () => ({ ... }));
```

### 2. What vi.mock() is used for
- [ ] Audit `runtime.vitest-only.ts` - what modules are mocked?
- [ ] Audit `TerminalMode.vitest-only.tsx` - what components are mocked?
- [ ] Can these be refactored to use dependency injection instead?

### 3. Abstraction Options

**Option A: Wrapper function**
```typescript
// src/tests/utils/mock.ts
export const mockModule = (path: string, factory: () => unknown) => {
  if (typeof Bun !== 'undefined') {
    const { mock } = require('bun:test');
    mock.module(path, factory);
  } else {
    vi.mock(path, factory);
  }
};
```

**Option B: Conditional imports**
```typescript
// Use dynamic imports based on environment
const { mock } = process.env.BUN_TEST
  ? await import('bun:test')
  : { mock: vi.mock };
```

**Option C: Dependency injection refactor**
- Refactor tests to inject dependencies instead of mocking modules
- More work upfront but cleaner long-term
- May not be feasible for all cases (e.g., React component mocking)

**Option D: Use only vitest**
- Simplest solution
- But loses bun test's speed advantage
- Not ideal if bun test is preferred

## Implementation Steps

1. **Audit phase**
   - [ ] List all `vi.mock()` calls in vitest-only files
   - [ ] Categorize by mock type (module, component, function)
   - [ ] Check if bun's `mock.module()` covers all use cases

2. **Prototype phase**
   - [ ] Create `src/tests/utils/mock.ts` wrapper
   - [ ] Test with one simple mock case
   - [ ] Verify works in both runners

3. **Migration phase**
   - [ ] Convert `TerminalMode.vitest-only.tsx` → `TerminalMode.test.tsx`
   - [ ] Convert `runtime.vitest-only.ts` → `runtime.test.ts`
   - [ ] Update vitest.config.ts to remove `.vitest-only` pattern

4. **Cleanup phase**
   - [ ] Remove `.vitest-only` naming convention
   - [ ] Update bunfig.toml comments
   - [ ] Document unified mocking approach

## Success Criteria

- [ ] All 650 tests run under `bun test`
- [ ] All 650 tests still run under `vitest` (for CI parity)
- [ ] No `.vitest-only.` files remain
- [ ] Single test command works: `bun test`

## Risks

1. **Bun mock.module() limitations** - May not support all vi.mock() features
2. **Hoisting differences** - vi.mock() hoists, bun may not
3. **React Testing Library compatibility** - Component mocking may differ

## References

- [Bun test mocking docs](https://bun.sh/docs/test/mocking)
- [Vitest mocking docs](https://vitest.dev/api/vi.html#vi-mock)
- Current vitest-only files:
  - `src/tests/golden-projects/runtime.vitest-only.ts`
  - `src/components/Terminal/TerminalMode.vitest-only.tsx`

## Priority

**Medium** - Not blocking, but reduces cognitive overhead and simplifies CI.

---

*Created: 2026-02-03*
