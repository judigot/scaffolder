# Design System Quick Reference

## 🎨 Token Hierarchy

```
Foundation Token → Primitive Token → Component Class
--color-blue-500 → --btn-primary-bg → .btn-primary
```

## 📁 File Structure

```
foundations/     → Raw values (colors, spacing, fonts)
primitives/      → Semantic meanings (buttons, theme)
components/      → UI implementations (.btn-primary)
```

## ✅ Do's and ❌ Don'ts

### Token Usage

```scss
// ✅ DO: Use primitive tokens in components
.btn-primary {
  background: var(--btn-primary-bg);
}

// ❌ DON'T: Skip the primitive layer
.btn-primary {
  background: var(--color-blue-500); // BAD!
}
```

### CSS Approach

```scss
// ✅ DO: Use native CSS (Tailwind v4)
.btn-primary {
  display: inline-flex;
  padding: 0.625rem 0.75rem;
  background: var(--btn-primary-bg);
}

// ❌ DON'T: Use @apply in component styles
.btn-primary {
  @apply flex px-3 py-2 bg-blue-500; // BAD!
}
```

### React Components

```tsx
// ✅ DO: Use semantic classes
<button className="btn-primary">Click</button>

// ❌ DON'T: Use inline token references
<button className="bg-(--btn-primary-bg)">Click</button>
```

## 🎯 Common Tasks

### Add New Color

1. **Foundation**: `foundations/_colors.scss`

   ```scss
   @theme {
     --color-teal-500: oklch(65% 0.15 180);
   }
   ```

2. **Primitive**: `primitives/_theme.scss`
   ```scss
   @theme {
     --interactive-accent: var(--color-teal-500);
   }
   ```

### Add Button Variant

1. **Tokens**: `primitives/_buttons.scss`

   ```scss
   @theme {
     --btn-tertiary-bg: var(--color-neutral-800);
     --btn-tertiary-hover: var(--color-neutral-700);
   }
   ```

2. **Component**: `components/buttons/_variants.scss`
   ```scss
   .btn-tertiary {
     background: var(--btn-tertiary-bg);
     &:hover {
       background: var(--btn-tertiary-hover);
     }
   }
   ```

## 🚫 Invariants (Never Break!)

1. **Token Hierarchy**: Components → Primitives → Foundations
2. **CSS-First**: No `@apply` in component styles
3. **@theme Only**: All tokens in `@theme` blocks
4. **@forward**: Use `@forward` in index files
5. **Naming**: Follow strict patterns (see agent doc)

## 📚 Documentation

- Full docs: `src/styles/README.md`
- Agent: `agents/design-system.md`
- Examples: See existing button components

## 🤖 Agent

When working with styles, invoke: **@design-system**

```
Use this agent to:
- Add new components/variants
- Modify colors or tokens
- Enforce design system rules
- Review style changes
```
