---
id: frontend-ui-spec-template
type: template
domain: generic
status: stable
version: 1.0.0
---

# Frontend / UI Spec Template

## Purpose

Define how to describe UI behavior in a framework-agnostic, web-focused way. AI agents use this template to generate components, screens, and UI tests.

## When to use

Use this template when:
- Designing new screens or pages
- Creating reusable UI components
- Specifying complex user interactions
- Planning frontend feature implementation

## Required sections

Copy the template below. Include all sections for complete specifications.

---

# Template: [Screen/Component Name] UI Specification

```markdown
---
id: [kebab-case-ui-id]
type: ui-spec
domain: [domain-name]
status: draft | in-review | approved | implemented
version: 1.0.0
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
---

# [Screen/Component Name]

## Overview

[Brief description of this screen/component and its purpose]

## Screen/Component Hierarchy

```
[ScreenName]
├── [Component1]
│   ├── [SubComponent1a]
│   └── [SubComponent1b]
├── [Component2]
└── [Component3]
```

## Components

### [ComponentName]

**Responsibility:** [What this component does]

**Props/Inputs:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| [name] | string | Yes | - | [Description] |
| [name] | () => void | No | - | [Callback description] |

**Internal State:**

| State | Type | Initial | Description |
|-------|------|---------|-------------|
| [name] | boolean | false | [Description] |

**Emitted Events/Outputs:**

| Event | Payload | When |
|-------|---------|------|
| [name] | { id: string } | [Trigger condition] |

---

## States and Transitions

### State Diagram

```
┌─────────────┐
│   INITIAL   │
└──────┬──────┘
       │ load
       ▼
┌─────────────┐
│   LOADING   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌───────┐
│ DATA │ │ ERROR │
└──────┘ └───────┘
```

### State Definitions

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Initial | Component mounted, no data fetch | Show skeleton/placeholder |
| Loading | Data fetch in progress | Show loading indicator |
| Success | Data loaded successfully | Display data |
| Empty | Data loaded, empty result | Show empty state message |
| Error | Data fetch failed | Show error message with retry |
| Disabled | [Condition] | Disable interactions, show disabled style |

### State Transitions

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| Initial | Loading | Component mount | Fetch data |
| Loading | Success | Data received | Render data |
| Loading | Error | Fetch failed | Log error |
| Error | Loading | Retry clicked | Retry fetch |

---

## Data Dependencies

### API Calls

| API | When Called | Data Used | Failure Handling |
|-----|-------------|-----------|------------------|
| GET /api/[resource] | On mount | [fields used] | Show error state |
| POST /api/[resource] | On submit | [fields sent] | Show error toast |

### Expected Data Shape

```typescript
interface [DataName] {
  id: string;
  [field]: [type];
}
```

### Error Scenarios

| Scenario | User Message | Recovery Action |
|----------|--------------|-----------------|
| Network error | "Connection failed. Check your internet." | Retry button |
| 401 Unauthorized | Redirect to login | - |
| 404 Not found | "[Resource] not found" | Back navigation |
| 500 Server error | "Something went wrong. Try again." | Retry button |

---

## Interaction Flows

### Flow: [Flow Name]

**Preconditions:** [What must be true before this flow]

**Steps:**

1. **User action:** [What user does]
   **System response:** [What UI shows/does]
   **State change:** [New state if any]

2. **User action:** [Next action]
   **System response:** [Response]
   **State change:** [State]

**Postconditions:** [What is true after flow completes]

### Navigation

| Action | Destination | Data Passed |
|--------|-------------|-------------|
| [Click/Event] | /path/to/screen | { id: string } |

---

## Accessibility Requirements

### Keyboard Navigation

| Key | Action | Focus Behavior |
|-----|--------|----------------|
| Tab | Move to next interactive element | Follows DOM order |
| Shift+Tab | Move to previous element | Reverse DOM order |
| Enter | Activate focused button/link | - |
| Escape | Close modal/dropdown | Return focus to trigger |
| Arrow keys | Navigate within component | [Specific behavior] |

### ARIA Requirements

| Element | ARIA Attribute | Value |
|---------|----------------|-------|
| Modal | role | dialog |
| Modal | aria-modal | true |
| Modal | aria-labelledby | [title id] |
| Button (loading) | aria-busy | true |
| Error message | role | alert |
| Form field | aria-invalid | true (when error) |
| Form field | aria-describedby | [error message id] |

### Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| Form submitted | "Form submitted successfully" |
| Error occurred | "[Error message]" |
| Data loading | "Loading [content type]" |
| Data loaded | "[Count] items loaded" |

### Visual Requirements

- [ ] Focus indicator visible (min 2px outline)
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Color contrast ratio ≥ 3:1 for UI components
- [ ] Text resizable to 200% without loss
- [ ] No content conveyed by color alone

---

## Design Constraints

### Layout

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| < 640px | Single column, stacked | Mobile |
| 640-1024px | Two column | Tablet |
| > 1024px | Multi-column with sidebar | Desktop |

### Design Tokens (Generic)

| Token | Description | Example |
|-------|-------------|---------|
| --color-primary | Primary action color | Buttons, links |
| --color-error | Error state color | Error text, borders |
| --color-success | Success state color | Success messages |
| --spacing-sm | Small spacing | 8px equivalent |
| --spacing-md | Medium spacing | 16px equivalent |
| --radius-md | Medium border radius | 8px equivalent |

### Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Heading 1 | 2rem | Bold | 1.2 |
| Heading 2 | 1.5rem | Semi-bold | 1.3 |
| Body | 1rem | Normal | 1.5 |
| Caption | 0.875rem | Normal | 1.4 |

---

## Testing Requirements

### Component Tests

- [ ] Renders correctly in each state (loading, success, empty, error)
- [ ] Props are applied correctly
- [ ] Events fire with correct payload
- [ ] Accessibility attributes present

### Integration Tests

- [ ] Data fetching triggers correctly
- [ ] Error handling displays proper message
- [ ] User interactions update state
- [ ] Navigation works correctly

### E2E Tests (Critical Paths)

- [ ] Complete user flow from entry to success
- [ ] Error recovery flow
- [ ] Cross-browser compatibility verified

### Visual/Snapshot Tests (Optional)

- [ ] Component appearance captured
- [ ] Responsive layouts verified
```

---

## Example

Complete example of a UI screen specification:

---

```markdown
---
id: task-list-screen
type: ui-spec
domain: productivity
status: approved
version: 1.0.0
created: 2024-01-15
updated: 2024-01-20
---

# Task List Screen

## Overview

Main screen displaying the user's tasks with filtering, sorting, and CRUD operations. Entry point for task management.

## Screen/Component Hierarchy

```
TaskListScreen
├── Header
│   ├── PageTitle
│   └── CreateTaskButton
├── FilterBar
│   ├── StatusFilter
│   ├── PriorityFilter
│   └── SortSelector
├── TaskList
│   └── TaskCard (repeated)
│       ├── TaskTitle
│       ├── TaskMeta
│       └── TaskActions
├── EmptyState
├── LoadingState
├── ErrorState
└── Pagination
```

## Components

### TaskListScreen

**Responsibility:** Container screen managing task list state and orchestrating child components.

**Props/Inputs:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| initialFilters | FilterState | No | {} | Pre-applied filters from URL |

**Internal State:**

| State | Type | Initial | Description |
|-------|------|---------|-------------|
| tasks | Task[] | [] | Current page of tasks |
| loading | boolean | true | Data fetch in progress |
| error | Error \| null | null | Fetch error if any |
| filters | FilterState | {} | Active filters |
| pagination | PaginationState | {page:1,limit:20} | Pagination state |

---

### TaskCard

**Responsibility:** Display single task with actions.

**Props/Inputs:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| task | Task | Yes | - | Task data to display |
| onEdit | (id: string) => void | Yes | - | Edit callback |
| onDelete | (id: string) => void | Yes | - | Delete callback |
| onStatusChange | (id: string, status: Status) => void | Yes | - | Status toggle |

**Internal State:**

| State | Type | Initial | Description |
|-------|------|---------|-------------|
| menuOpen | boolean | false | Actions menu visibility |
| confirmDelete | boolean | false | Delete confirmation shown |

**Emitted Events/Outputs:**

| Event | Payload | When |
|-------|---------|------|
| edit | { id: string } | Edit button clicked |
| delete | { id: string } | Delete confirmed |
| statusChange | { id: string, status: Status } | Checkbox toggled |

---

### FilterBar

**Responsibility:** Control filtering and sorting of task list.

**Props/Inputs:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| filters | FilterState | Yes | - | Current filter state |
| onChange | (filters: FilterState) => void | Yes | - | Filter change callback |

---

## States and Transitions

### State Diagram

```
┌─────────────┐
│   INITIAL   │
└──────┬──────┘
       │ mount
       ▼
┌─────────────┐
│   LOADING   │◄────────┐
└──────┬──────┘         │
       │                │ retry
   ┌───┴───┐            │
   │       │            │
   ▼       ▼            │
┌──────┐ ┌───────┐──────┘
│ DATA │ │ ERROR │
└──┬───┘ └───────┘
   │
   ├─── empty? ──► EMPTY
   │
   └─── has data ──► SUCCESS
```

### State Definitions

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Initial | Screen mounted | Nothing rendered |
| Loading | Fetching tasks | Show skeleton cards (3-5) |
| Success | Tasks loaded, count > 0 | Show TaskCard list |
| Empty | Tasks loaded, count = 0 | Show EmptyState with CTA |
| Error | Fetch failed | Show ErrorState with retry |

### State Transitions

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| Initial | Loading | Component mount | Call GET /tasks |
| Loading | Success | Tasks received | Update tasks state |
| Loading | Empty | Empty array received | - |
| Loading | Error | API error | Log error |
| Success | Loading | Filter changed | Refetch with filters |
| Error | Loading | Retry clicked | Retry API call |
| Any | Loading | Page changed | Fetch new page |

---

## Data Dependencies

### API Calls

| API | When Called | Data Used | Failure Handling |
|-----|-------------|-----------|------------------|
| GET /api/v1/tasks | Mount, filter change, page change | tasks[], pagination | Show ErrorState |
| PATCH /api/v1/tasks/:id | Status toggle, inline edit | Updated task | Toast error, revert UI |
| DELETE /api/v1/tasks/:id | Delete confirmed | - | Toast error |

### Expected Data Shape

```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FilterState {
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  sort?: "createdAt" | "dueDate" | "priority";
  order?: "asc" | "desc";
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Error Scenarios

| Scenario | User Message | Recovery Action |
|----------|--------------|-----------------|
| Network error | "Couldn't load tasks. Check your connection." | Retry button |
| 401 Unauthorized | - (redirect) | Redirect to /login |
| 500 Server error | "Something went wrong. Please try again." | Retry button |
| Delete failed | "Couldn't delete task. Please try again." | Toast with retry |

---

## Interaction Flows

### Flow: Filter Tasks by Status

**Preconditions:** Task list loaded successfully

**Steps:**

1. **User action:** Click status filter dropdown
   **System response:** Show dropdown with options: All, Pending, In Progress, Completed
   **State change:** -

2. **User action:** Select "Completed"
   **System response:** Close dropdown, show loading state
   **State change:** filters.status = "completed", loading = true

3. **User action:** -
   **System response:** Fetch filtered tasks, display results
   **State change:** tasks = filtered results, loading = false

**Postconditions:** Only completed tasks displayed, URL updated with filter param

### Flow: Delete Task

**Preconditions:** Task list loaded, at least one task visible

**Steps:**

1. **User action:** Click task card menu button (three dots)
   **System response:** Show context menu with Edit, Delete options
   **State change:** menuOpen = true

2. **User action:** Click "Delete"
   **System response:** Show confirmation dialog "Delete this task?"
   **State change:** confirmDelete = true, menuOpen = false

3. **User action:** Click "Confirm"
   **System response:** Close dialog, optimistically remove card, call DELETE API
   **State change:** Remove task from list

4. **System response (success):** Show success toast "Task deleted"
   **System response (failure):** Restore card, show error toast with retry

**Postconditions:** Task removed from list and database

### Flow: Toggle Task Status

**Preconditions:** Task visible in list

**Steps:**

1. **User action:** Click checkbox on task card
   **System response:** Immediately toggle checkbox, show subtle loading indicator
   **State change:** Optimistic update to task.status

2. **System response (success):** Remove loading indicator
   **System response (failure):** Revert checkbox, show error toast

**Postconditions:** Task status updated

### Navigation

| Action | Destination | Data Passed |
|--------|-------------|-------------|
| Click task card | /tasks/:id | - (ID in URL) |
| Click "Create Task" | /tasks/new | - |
| Click "Edit" in menu | /tasks/:id/edit | - (ID in URL) |

---

## Accessibility Requirements

### Keyboard Navigation

| Key | Action | Focus Behavior |
|-----|--------|----------------|
| Tab | Move through interactive elements | Filter → Create → Tasks → Pagination |
| Enter | Open task detail / Activate button | - |
| Space | Toggle checkbox / Activate button | - |
| Escape | Close open menu/dialog | Return to trigger element |
| Arrow Down | Next item in dropdown | Within dropdown |
| Arrow Up | Previous item in dropdown | Within dropdown |

### ARIA Requirements

| Element | ARIA Attribute | Value |
|---------|----------------|-------|
| Task list | role | list |
| Task card | role | listitem |
| Checkbox | role | checkbox |
| Checkbox | aria-checked | true/false |
| Filter dropdown | aria-expanded | true/false |
| Filter dropdown | aria-haspopup | listbox |
| Delete dialog | role | alertdialog |
| Delete dialog | aria-labelledby | dialog-title |
| Loading skeleton | aria-busy | true |
| Loading skeleton | aria-label | Loading tasks |

### Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| Tasks loaded | "[Count] tasks loaded" |
| Filter applied | "Showing [status] tasks" |
| Task deleted | "Task deleted" |
| Status changed | "Task marked as [status]" |
| Error occurred | "[Error message]" |

### Visual Requirements

- [x] Focus ring visible on all interactive elements
- [x] 4.5:1 contrast for body text
- [x] 3:1 contrast for icons and borders
- [x] Status indicated by icon + text, not color alone
- [x] Priority indicated by label, not color alone

---

## Design Constraints

### Layout

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| < 640px | Single column, full-width cards | Stack filters vertically |
| 640-1024px | Single column, padded cards | Horizontal filter bar |
| > 1024px | Centered max-width container | - |

### Design Tokens (Generic)

| Token | Usage |
|-------|-------|
| --color-primary | Create button, selected filter |
| --color-error | Error states, overdue indicator |
| --color-success | Completed status |
| --color-warning | High priority indicator |
| --color-muted | Empty state text |
| --spacing-card | Padding within TaskCard |
| --radius-card | TaskCard border radius |

### Component Sizes

| Component | Height | Width |
|-----------|--------|-------|
| TaskCard | Auto (min 80px) | 100% |
| FilterBar | 48px | 100% |
| Pagination | 48px | Auto |

---

## Testing Requirements

### Component Tests

- [ ] TaskCard renders all task data correctly
- [ ] TaskCard checkbox toggles on click
- [ ] TaskCard menu opens on button click
- [ ] FilterBar updates filters on selection
- [ ] EmptyState shows correct message and CTA
- [ ] ErrorState shows message and retry button
- [ ] Pagination shows correct page info

### Integration Tests

- [ ] Screen fetches tasks on mount
- [ ] Filter change triggers new fetch
- [ ] Pagination change loads correct page
- [ ] Delete removes task from list
- [ ] Status toggle updates task
- [ ] Error state shows on API failure
- [ ] Retry button refetches data

### E2E Tests (Critical Paths)

- [ ] Load task list and verify display
- [ ] Filter by status and verify results
- [ ] Navigate to task detail
- [ ] Delete task and verify removal
- [ ] Complete task via checkbox

### Accessibility Tests

- [ ] Keyboard navigation through all elements
- [ ] Screen reader announces state changes
- [ ] Focus management on modal open/close
```

---

## Checklist for AI Agents

Before implementing:

- [ ] Read entire UI spec including all components
- [ ] Understand component hierarchy and responsibilities
- [ ] Note all states and transitions
- [ ] Identify accessibility requirements
- [ ] Check data dependencies and shapes

During implementation:

- [ ] Create components matching hierarchy
- [ ] Implement all defined states
- [ ] Add proper ARIA attributes
- [ ] Handle all error scenarios
- [ ] Write tests for each component

After implementation:

- [ ] All states render correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announcements work
- [ ] Component tests pass
- [ ] Integration tests pass

