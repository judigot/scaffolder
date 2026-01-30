# Design System Architecture

Enterprise-grade design system following industry standards (IBM Carbon, Salesforce Lightning, GOV.UK).

## 📁 Folder Structure

```
src/styles/
├── foundations/          # Layer 1: Atomic design tokens
│   ├── _colors.scss     # Color palette (raw values)
│   ├── _spacing.scss    # Spacing scale
│   ├── _typography.scss # Font system
│   └── _index.scss      # Aggregator
│
├── primitives/          # Layer 2: Semantic tokens
│   ├── _theme.scss      # Theme mappings (light/dark)
│   ├── _buttons.scss    # Button-specific tokens
│   ├── _layout.scss     # Layout tokens (borders, surfaces)
│   └── _index.scss      # Aggregator
│
├── components/          # Layer 3: Component styles
│   ├── buttons/
│   │   ├── _tokens.scss # Component tokens
│   │   ├── _base.scss   # Base styles
│   │   ├── _variants.scss # Variants (primary, secondary)
│   │   └── _index.scss  # Aggregator
│   ├── forms/
│   ├── modals/
│   └── _index.scss
│
├── utilities/           # Layer 4: Helper classes
│   ├── _layout.scss     # Flexbox, grid helpers
│   ├── _typography.scss # Text utilities
│   ├── _spacing.scss    # Margin/padding utilities
│   └── _index.scss
│
└── main.scss            # Main entry point

```

## 🎯 Design Principles

### 1. Separation of Concerns

- **Foundations**: Raw values (never use directly in components)
- **Primitives**: Semantic meaning (theme-aware)
- **Components**: UI patterns
- **Utilities**: One-off helpers

### 2. Token Hierarchy

```
Foundation Token → Primitive Token → Component Token → Component Class
   #3b82f6    →   --color-primary  →  --btn-primary-bg  →  .btn-primary
```

### 3. Naming Convention

- **Foundations**: `--color-blue-500`, `--spacing-04`
- **Primitives**: `--color-interactive`, `--surface-raised`
- **Components**: `--btn-primary-bg`, `--input-border`
- **Classes**: `.btn-primary`, `.input-field`

## 📖 Usage Examples

### Import Order (in main.scss)

```scss
// 1. Tailwind base
@use 'tailwindcss';

// 2. Foundations
@use './foundations' as *;

// 3. Primitives
@use './primitives' as *;

// 4. Components
@use './components' as *;

// 5. Utilities
@use './utilities' as *;
```

### In Components (React/TSX)

```tsx
// ✅ Correct: Use component classes
<button className="btn-primary">Click me</button>

// ✅ Correct: Use with modifiers
<button className="btn-secondary btn-full">Full Width</button>

// ❌ Wrong: Don't use foundation tokens directly
<button className="bg-blue-500">Click me</button>

// ❌ Wrong: Don't use inline CSS variables
<button style={{ background: 'var(--color-blue-500)' }}>Click me</button>
```

### In SCSS (for custom components)

```scss
@use '../foundations' as *;
@use '../primitives' as *;

.custom-component {
  // ✅ Use primitive tokens
  background: var(--surface-raised);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  padding: var(--spacing-04);

  // ❌ Don't use foundation tokens directly
  // background: var(--color-neutral-800);  // Wrong!
}
```

## 🔄 Migration from Old Structure

### Old:

```scss
// Inline styles everywhere
className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2"
```

### New:

```scss
// Semantic component classes
className="btn-secondary"
```

## 🎨 Theming

Themes are defined in `primitives/_theme.scss`. To add a new theme:

1. Create theme tokens in primitives
2. Map to foundation colors
3. Components automatically adapt

## 📚 References

- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
