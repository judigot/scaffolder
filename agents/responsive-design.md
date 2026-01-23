---
name: responsive-design
description: Use this agent when working on responsive layouts, mobile/desktop view switching, or UI components that need to adapt to different screen sizes. Examples:

<example>
Context: User needs to add mobile-responsive behavior
user: "Make this component work on mobile"
assistant: "I'll use the responsive-design agent to implement mobile-first responsive design following the established patterns."
<commentary>
This triggers because the user needs responsive layout implementation.
</commentary>
</example>

<example>
Context: User wants to understand the mobile tab navigation
user: "How does the bottom tab bar work?"
assistant: "I'll use the responsive-design agent to explain the tab navigation system and its invariants."
<commentary>
This triggers because the user needs to understand responsive UI components.
</commentary>
</example>

<example>
Context: User reports layout issues on different screen sizes
user: "The file tree looks weird on my phone"
assistant: "I'll use the responsive-design agent to diagnose and fix the responsive layout issue."
<commentary>
This triggers because the user has a responsive design problem.
</commentary>
</example>

model: inherit
color: cyan
tools: ["Read", "Write", "Bash", "Grep"]
---

# Responsive Design Agent

This agent provides guidance for implementing mobile-first responsive design patterns in the Scaffolder application. It documents the established invariants, patterns, and implementation details for both mobile and desktop views.

## Design Philosophy

**Mobile-First**: All responsive design starts with mobile constraints and progressively enhances for larger screens.

**Core Principles**:

1. **Snappy Interactions**: No delays, no transitions on layout changes
2. **Pure Tailwind CSS**: Prefer CSS-only solutions over JavaScript hacks
3. **State Preservation**: UI state (tree expansion, scroll position) should persist across view changes
4. **Minimal Re-renders**: Use CSS visibility (`hidden` class) instead of conditional rendering when preserving state

---

## Mobile View Invariants

### 1. Bottom Tab Navigation

**Location**: `src/AI.tsx`, `src/components/AI/TabBar.tsx`

**Invariants**:

- Tab bar is **fixed at bottom** of screen (`fixed bottom-0 left-0 right-0`)
- Tab bar has **exactly 2 tabs**: Code (left) and Chat (right)
- Active tab has **blue highlight** (`text-blue-400 bg-gray-700/50`)
- Inactive tabs are **gray** (`text-gray-400`)
- Tab bar height is accounted for with **bottom padding** on content (`pb-16`)
- Tab bar has **z-index 50** to stay above content

**Code Icon States**:

- No generated code: `</>` (slash between angle brackets)
- Has generated code: `<●>` (green dot between angle brackets)
- Green dot uses `bg-green-500` with `w-2 h-2 rounded-full`

**Tab Switching**:

- **No animations** - instant tab switching
- Tabs switch via `activeTab` state in parent component
- Keyboard shortcut: `Ctrl+B` (or `Cmd+B` on Mac) toggles between tabs
- When AI generates schema, auto-switch to Code tab via `onTabChange("fileViewer")`

```tsx
// TabBar.tsx structure
<div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex z-50">
  <button /* Code tab - left */ />
  <button /* Chat tab - right */ />
</div>
```

### 2. Mobile FileViewer (Accordion Pattern)

**Location**: `src/components/FileViewer.tsx`

**Invariants**:

- File tree uses **accordion pattern** on mobile
- Accordion header is a **"Files" button** that toggles open/closed
- Accordion panel has **max height of 66vh** (`max-h-[66vh]`) - rule of thirds
- Editor is **always visible** below accordion (occupies remaining ~33vh minimum)
- Accordion uses **CSS `hidden` class**, NOT conditional rendering (preserves tree state)
- Tree expansion state is preserved when accordion closes
- Accordion **auto-expands** when no file is selected

**Mobile Detection**:

```tsx
const [isMobile, setIsMobile] = useState<boolean>(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768); // md breakpoint
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

**Accordion Structure**:

```tsx
{
  /* Mobile: Accordion file tree */
}
{
  isMobile && (
    <div className="flex flex-col h-full">
      {/* Accordion header - always visible */}
      <button onClick={() => setIsTreeOpen(!isTreeOpen)}>
        Files {isTreeOpen ? '▼' : '▶'}
      </button>

      {/* Accordion panel - collapsible */}
      <div
        className={`max-h-[66vh] overflow-auto ${!isTreeOpen ? 'hidden' : ''}`}
      >
        <SimpleTreeView>
          {renderTree(folderStructure, setSelectedFile)}
        </SimpleTreeView>
      </div>

      {/* Editor - always visible below */}
      <div className="flex-1 min-h-0">{/* Monaco Editor */}</div>
    </div>
  );
}
```

**Auto-expand Behavior**:

```tsx
useEffect(() => {
  if (isMobile && selectedFile === null) {
    setIsTreeOpen(true);
  }
}, [isMobile, selectedFile]);
```

### 3. Mobile-Specific Constraints

**Invariants**:

- **No horizontal scrolling** on the main layout
- Touch targets minimum **44x44px** for accessibility
- Content must be **readable without zooming**
- Forms and inputs use **full width** on mobile
- Modal dialogs are **full-screen or near full-screen** on mobile

---

## Desktop View Invariants

### 1. Side-by-Side Layout

**Location**: `src/components/FileViewer.tsx`

**Invariants**:

- Desktop uses **horizontal split**: file tree (left) + editor (right)
- File tree panel has **fixed width of 288px** (`w-72`)
- File tree panel **does not grow/shrink** with content (`shrink-0`)
- Deep nesting handled via **horizontal scroll** within the panel
- Editor takes **remaining space** (`flex-1`)

**Panel Structure**:

```tsx
{
  /* Desktop: Side-by-side file tree panel */
}
{
  !isMobile && (
    <div className="w-72 bg-gray-800 select-none flex flex-col shrink-0 rounded-md overflow-hidden">
      {/* Toolbar with action buttons */}
      {mode === 'edit' && (
        <div className="p-2 border-b border-gray-700 space-y-1 shrink-0">
          {/* Action buttons: Create App, Export, Download, New File, New Folder */}
        </div>
      )}

      {/* File tree with horizontal scroll */}
      <div className="flex-1 overflow-auto p-2">
        <div className="min-w-max">
          <SimpleTreeView>
            {renderTree(folderStructure, setSelectedFile)}
          </SimpleTreeView>
        </div>
      </div>
    </div>
  );
}
```

### 2. File Tree Panel (VS Code Pattern)

**Invariants**:

- Panel width is **fixed at 288px** (`w-72`) - no dynamic sizing
- Content uses `min-w-max` to **prevent text wrapping**
- Container uses `overflow-auto` for **horizontal and vertical scroll**
- **No JavaScript width tracking** - pure CSS solution
- **No resize delays** - instant response

**Why Fixed Width**:

- Dynamic width (`w-fit`) causes shrinking delays when folders collapse
- ResizeObserver-based solutions add JavaScript complexity
- VS Code uses fixed sidebar width - proven UX pattern
- Horizontal scroll is expected behavior for deep nesting

### 3. Desktop Action Toolbar

**Location**: `src/components/FileViewer.tsx` (lines ~2703-2837)

**Button Layout**:

```
Row 1: [Create App] [Export (n)] [Download] [New File] [New Folder]
Row 2: [Copy User Files] [Copy Structure]  <- Dev only
Row 3: [Project Selector Dropdown]
```

**Invariants**:

- Toolbar is **inside the file tree panel** (not floating)
- Buttons use **consistent sizing** (`text-xs px-2 py-1`)
- Primary actions use **indigo background** (`bg-indigo-600`)
- Secondary actions use **gray background** (`bg-gray-700`)
- Dev-only buttons only visible when `process.env.NODE_ENV === "development"`
- Toolbar has **bottom border** to separate from tree (`border-b border-gray-700`)

---

## Breakpoint Reference

| Breakpoint | Width  | Usage                        |
| ---------- | ------ | ---------------------------- |
| `sm`       | 640px  | Small tablets                |
| `md`       | 768px  | **Mobile/Desktop threshold** |
| `lg`       | 1024px | Desktop                      |
| `xl`       | 1280px | Large desktop                |
| `2xl`      | 1536px | Extra large                  |

**Primary Breakpoint**: `768px` (md) - This is where mobile switches to desktop layout.

---

## Anti-Patterns to Avoid

### 1. JavaScript Width Tracking

**DON'T**:

```tsx
// Anti-pattern: JS-based width tracking with delays
const [treePanelWidth, setTreePanelWidth] = useState(192);
const treePanelRef = useRef(null);

useEffect(() => {
  const observer = new ResizeObserver((entries) => {
    setTreePanelWidth(prev => Math.max(prev, entry.contentRect.width));
  });
  observer.observe(treePanelRef.current);
}, []);

<div ref={treePanelRef} style={{ minWidth: treePanelWidth }}>
```

**DO**:

```tsx
// Correct: Fixed width with CSS scroll
<div className="w-72 overflow-auto">
  <div className="min-w-max">{/* content */}</div>
</div>
```

### 2. Conditional Rendering for Visibility

**DON'T**:

```tsx
// Anti-pattern: Loses state when toggling
{
  isTreeOpen && <SimpleTreeView>{renderTree(folderStructure)}</SimpleTreeView>;
}
```

**DO**:

```tsx
// Correct: Preserves state with CSS
<div className={!isTreeOpen ? 'hidden' : ''}>
  <SimpleTreeView>{renderTree(folderStructure)}</SimpleTreeView>
</div>
```

### 3. CSS Transitions on Layout

**DON'T**:

```tsx
// Anti-pattern: Adds delay to interactions
<div className="transition-all duration-300 w-72">
```

**DO**:

```tsx
// Correct: Instant response
<div className="w-72">
```

### 4. Dynamic Max Width

**DON'T**:

```tsx
// Anti-pattern: Causes shrink delays
<div className="w-fit max-w-xs lg:max-w-sm">
```

**DO**:

```tsx
// Correct: Fixed width
<div className="w-72">
```

---

## Implementation Checklist

### Adding a New Responsive Component

1. [ ] Start with mobile layout first
2. [ ] Use `isMobile` state with resize listener
3. [ ] Mobile breakpoint is `768px` (md)
4. [ ] No CSS transitions on layout properties
5. [ ] Use `hidden` class for toggle visibility (not conditional rendering)
6. [ ] Fixed dimensions for panels that need stability
7. [ ] `overflow-auto` + `min-w-max` for scrollable content
8. [ ] Test keyboard shortcuts work on both layouts
9. [ ] Verify touch targets are 44px minimum on mobile

### Testing Responsive Design

1. Chrome DevTools responsive mode
2. Test at exactly 768px (breakpoint boundary)
3. Test accordion open/close preserves tree state
4. Test tab switching is instant (no animation delays)
5. Test deep folder nesting scrolls horizontally on desktop
6. Test keyboard shortcut `Ctrl+B` works

---

## File Reference

| File                                    | Purpose                                               |
| --------------------------------------- | ----------------------------------------------------- |
| `src/AI.tsx`                            | Main layout, tab state management, keyboard shortcuts |
| `src/components/AI/TabBar.tsx`          | Bottom tab navigation component                       |
| `src/components/AI/AIChatContainer.tsx` | Container that responds to activeTab                  |
| `src/components/FileViewer.tsx`         | File tree with mobile accordion + desktop sidebar     |

---

## Key State Variables

```tsx
// AI.tsx
const [activeTab, setActiveTab] = useState<TabType>('chat');

// FileViewer.tsx
const [isTreeOpen, setIsTreeOpen] = useState<boolean>(true);
const [isMobile, setIsMobile] = useState<boolean>(false);
```

---

## Common Tasks

### Switch to Code Tab Programmatically

```tsx
// In AIChatContainer.tsx - when schema is generated
useEffect(() => {
  if (extractedSchema !== null) {
    setSchemaInfo(extractedSchema);
    onTabChange('fileViewer'); // Switch to code tab
  }
}, [extractedSchema, setSchemaInfo, onTabChange]);
```

### Check Current View Mode

```tsx
// In any component
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
```

### Add Keyboard Shortcut

```tsx
// Pattern from AI.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setActiveTab((prev) => (prev === 'chat' ? 'fileViewer' : 'chat'));
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```
