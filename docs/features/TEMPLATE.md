# Feature: [Feature Name]

**Feature ID**: F00X  
**Status**: ✅ Production | 🚧 In Progress | 📋 Planned | ⚠️ Deprecated  
**Created**: YYYY-MM-DD (commit `abc1234`)  
**Last Modified**: YYYY-MM-DD (commit `def5678`)  
**Owner**: @username or team name

---

## Quick Summary (50-100 tokens)

[One concise paragraph explaining what this feature does, why it exists, and what problem it solves. This is the first thing AI agents read - make it count!]

---

## Git History References

**Initial Implementation**:

- **Commit**: `abc1234`
- **Date**: YYYY-MM-DD
- **Author**: @username
- **PR**: #XX
- **Stats**: X files changed, Y insertions, Z deletions

**Key Commits**:

- `abc1234` - Initial implementation: [description]
- `def5678` - Bug fix: [what was fixed]
- `ghi9012` - Enhancement: [what was added]
- `jkl3456` - Refactor: [what was improved]

**Related PRs**: #XX, #YY, #ZZ

**Git Commands** (for agents):

```bash
# View all commits for this feature
git log --grep="F00X" --oneline

# View file history
git log --grep="F00X" --name-only --pretty=format: | sort -u

# View feature timeline
git log --grep="F00X" --pretty=format:"%h - %ar - %s"

# View detailed changes
git log --grep="F00X" -p
```

---

## 📂 Complete File Map

### Frontend Components

```
src/components/FeatureName/
├── MainComponent.tsx (350 lines)
│   ├── Purpose: [What this component does]
│   ├── Responsibilities:
│   │   - [Responsibility 1]
│   │   - [Responsibility 2]
│   ├── Uses: useFeatureHook, FeatureStore, OtherService
│   ├── Props:
│   │   - prop1: string (description)
│   │   - prop2: number (description)
│   │   - onAction: () => void (callback for...)
│   ├── State: [What local state it manages]
│   └── Integrates: SubComponent, OtherFeatureComponent
│
├── SubComponent.tsx (180 lines)
│   ├── Purpose: [What this does]
│   ├── Uses: HelperUtil, ValidationHook
│   └── Props: [...]
│
└── types.ts (50 lines)
    ├── Exports: IFeatureProps, IFeatureState, FeatureResponse
    └── Purpose: TypeScript interfaces for this feature
```

**Component Hierarchy**:

```
<MainComponent>
  <SubComponent>
    <AnotherComponent />
  </SubComponent>
  <ThirdComponent />
</MainComponent>
```

### Backend Routes

```
src/app/routes/
└── featureName.ts (240 lines)
    ├── GET /api/feature
    │   ├── Purpose: Retrieve feature data
    │   ├── Query params: id, filter, limit
    │   ├── Returns: FeatureResponse[]
    │   └── Auth: Required
    │
    ├── POST /api/feature
    │   ├── Purpose: Create new feature item
    │   ├── Body: CreateFeatureRequest
    │   ├── Validates: schema with Zod
    │   ├── Calls: featureService.create()
    │   └── Returns: FeatureResponse
    │
    └── PUT /api/feature/:id
        ├── Purpose: Update feature item
        ├── Params: id (string)
        ├── Body: UpdateFeatureRequest
        └── Returns: FeatureResponse
```

### Services & Business Logic

```
src/app/services/
└── featureService.ts (300 lines)
    ├── Exports:
    │   - createFeature(data): Promise<Feature>
    │   - updateFeature(id, data): Promise<Feature>
    │   - deleteFeature(id): Promise<void>
    │   - validateFeature(data): ValidationResult
    │
    ├── Dependencies:
    │   - database client
    │   - validation utils
    │   - external API client
    │
    └── Purpose: Core business logic for feature operations
```

### Utils & Helpers

```
src/utils/
├── featureValidator.ts (150 lines)
│   ├── Exports: validateFeatureSchema, checkConstraints
│   ├── Uses: Zod schemas
│   └── Purpose: Input validation and constraint checking
│
├── featureHelpers.ts (100 lines)
│   ├── Exports: formatFeatureData, transformResponse
│   └── Purpose: Data transformation utilities
│
└── featureConstants.ts (30 lines)
    └── Exports: Feature-related constants and enums
```

### State Management

```
src/stores/
└── useFeatureStore.ts (200 lines)
    ├── Framework: Zustand
    ├── State:
    │   - features: Feature[]
    │   - selectedFeature: Feature | null
    │   - loading: boolean
    │   - error: Error | null
    │
    ├── Actions:
    │   - fetchFeatures(): Promise<void>
    │   - selectFeature(id): void
    │   - updateFeature(id, data): Promise<void>
    │   - resetState(): void
    │
    ├── Persistence: localStorage/sessionStorage/none
    │
    └── Integrates: API routes, other stores
```

### Hooks

```
src/hooks/
├── useFeature.ts (120 lines)
│   ├── Purpose: Feature-specific React hook
│   ├── Returns: { feature, loading, error, refetch }
│   ├── Dependencies: useFeatureStore, useQuery
│   └── Use cases: Component data fetching
│
└── useFeatureActions.ts (80 lines)
    ├── Purpose: Feature mutation hook
    ├── Returns: { create, update, delete, loading }
    └── Use cases: Form submissions, CRUD operations
```

### Tests

```
src/tests/
├── components/
│   └── FeatureName/
│       ├── MainComponent.test.tsx (XX tests)
│       └── SubComponent.test.tsx (YY tests)
│
├── services/
│   └── featureService.test.ts (ZZ tests)
│
└── integration/
    └── feature-flow.test.ts (AA tests)
```

### Types & Interfaces

```
src/interfaces/
└── IFeature.ts (100 lines)
    ├── Exports:
    │   - IFeature (main interface)
    │   - IFeatureCreate (creation payload)
    │   - IFeatureUpdate (update payload)
    │   - IFeatureResponse (API response)
    │
    └── Used by: Components, services, stores
```

---

## 🔄 Data Flow

### Primary Flow (Happy Path)

```
User Action (button click, form submit)
    ↓
[MainComponent.tsx] - handleAction()
    ↓
[useFeatureStore] - updateFeature()
    ↓
API Call - POST /api/feature [featureName.ts]
    ↓
Route Handler - validate request
    ↓
[featureService.ts] - business logic
    ↓
[featureValidator.ts] - validate data
    ↓
Database Operation
    ↓
Response - return to client
    ↓
[useFeatureStore] - update state
    ↓
[MainComponent.tsx] - re-render with new data
    ↓
User sees updated UI
```

### Error Flow

```
User Action
    ↓
API Call
    ↓
Validation Fails - [featureValidator.ts]
    ↓
Error Response - 400/422
    ↓
[useFeatureStore] - set error state
    ↓
[MainComponent.tsx] - render error message
    ↓
User sees error feedback
```

### Alternative Flow (if applicable)

```
[Describe alternative paths, edge cases, or conditional flows]
```

---

## 🎯 Key Integration Points

### 1. Integration with [Other Feature/System]

**Location**: `src/path/to/file.ts` (lines 45-67)

```typescript
// Code snippet showing the integration
export function integrateWithOtherFeature() {
  // Actual code from the file
  const result = otherFeatureService.process(data);
  return transformResult(result);
}
```

**Purpose**: [Why this integration exists]

**Data Flow**: FeatureA → Integration Point → FeatureB

**Dependencies**:

- Depends on: OtherFeatureService
- Called by: MainComponent, BackgroundJob
- Triggers: WebhookNotification

**Error Handling**: [How errors are handled]

### 2. State Store Integration

**Location**: `src/stores/useFeatureStore.ts` (lines 12-34)

```typescript
// Store integration example
const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: [],
  actions: {
    addFeature: (feature) => {
      set((state) => ({
        features: [...state.features, feature],
      }));
      // Triggers other store updates
      useNotificationStore.getState().showSuccess('Feature added');
    },
  },
}));
```

**Cross-Store Dependencies**:

- Reads from: useAuthStore (for user context)
- Updates: useNotificationStore (for user feedback)
- Syncs with: useAnalyticsStore (for tracking)

### 3. External API Integration

**Location**: `src/app/services/featureService.ts` (lines 89-115)

```typescript
// External API call
async function syncWithExternalService(data: FeatureData) {
  const response = await fetch('https://api.external.com/endpoint', {
    method: 'POST',
    headers: {
      /* ... */
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

**API Details**:

- Endpoint: `https://api.external.com/endpoint`
- Authentication: Bearer token from env
- Rate limits: 100 requests/minute
- Retry logic: Exponential backoff, max 3 retries

---

## 🛠️ How to Modify This Feature

### Add New Data Field

**Goal**: Add a new field `priority` to the feature

**Steps**:

1. **Update interface** (`src/interfaces/IFeature.ts`, line 23):

   ```typescript
   export interface IFeature {
     // ... existing fields
     priority: 'low' | 'medium' | 'high'; // Add this
   }
   ```

2. **Update validation** (`src/utils/featureValidator.ts`, line 45):

   ```typescript
   const featureSchema = z.object({
     // ... existing fields
     priority: z.enum(['low', 'medium', 'high']), // Add this
   });
   ```

3. **Update database schema** (migration file):

   ```sql
   ALTER TABLE features ADD COLUMN priority VARCHAR(10) DEFAULT 'medium';
   ```

4. **Update component** (`src/components/FeatureName/MainComponent.tsx`, line 78):

   ```typescript
   // Add priority dropdown to form
   <select name="priority">
     <option value="low">Low</option>
     <option value="medium">Medium</option>
     <option value="high">High</option>
   </select>
   ```

5. **Update tests**:
   - `featureValidator.test.ts`: Add priority validation tests
   - `MainComponent.test.tsx`: Test priority selection

6. **Update this doc**: Add `priority` to interface section

### Change API Endpoint Behavior

**Goal**: Add filtering support to GET /api/feature

**Steps**:

1. **Update route handler** (`src/app/routes/featureName.ts`, line 34):

   ```typescript
   app.get('/api/feature', async (req, res) => {
     const { filter } = req.query;
     const features = await featureService.getFeatures({ filter });
     res.json(features);
   });
   ```

2. **Update service** (`src/app/services/featureService.ts`, line 56):

   ```typescript
   async function getFeatures(options: { filter?: string }) {
     const query = buildQuery(options);
     return database.query(query);
   }
   ```

3. **Update component** (fetch with filter):

   ```typescript
   const { data } = useQuery(['features', filter], () =>
     api.getFeatures({ filter }),
   );
   ```

4. **Update tests**: Add filter test cases

### Deprecate Old Functionality

**Goal**: Remove deprecated `oldMethod()` function

**Steps**:

1. **Find all usages** (grep):

   ```bash
   grep -r "oldMethod" src/
   ```

2. **Replace with new method** in all locations

3. **Update tests**: Remove oldMethod tests

4. **Update this doc**: Mark as deprecated, link to replacement

---

## 📊 File Metrics

| File                  | Lines | Complexity | Dependencies | Test Coverage |
| --------------------- | ----- | ---------- | ------------ | ------------- |
| `MainComponent.tsx`   | 350   | High       | 8 imports    | 85%           |
| `featureService.ts`   | 300   | Medium     | 5 imports    | 92%           |
| `featureValidator.ts` | 150   | Low        | 2 imports    | 100%          |
| `useFeatureStore.ts`  | 200   | Medium     | 3 imports    | 78%           |

**Complexity Legend**:

- **High**: Multiple responsibilities, complex logic, many dependencies
- **Medium**: Clear purpose, moderate logic, some dependencies
- **Low**: Single responsibility, simple logic, few dependencies

---

## 🧪 Testing Strategy

### Unit Tests

**Location**: `src/tests/unit/`

**Coverage**: 87% (target: 90%)

**Test Categories**:

1. **Component Tests** (`MainComponent.test.tsx` - 23 tests):
   - Rendering with different props
   - User interactions (clicks, form submissions)
   - State updates
   - Error handling

2. **Service Tests** (`featureService.test.ts` - 18 tests):
   - CRUD operations
   - Validation logic
   - Error scenarios
   - Edge cases

3. **Validator Tests** (`featureValidator.test.ts` - 15 tests):
   - Valid inputs
   - Invalid inputs
   - Boundary cases
   - Type checking

### Integration Tests

**Location**: `src/tests/integration/`

**Test Scenarios**:

1. **End-to-End Flow** (`feature-flow.test.ts` - 8 tests):
   - Complete user journey
   - API integration
   - State persistence
   - Error recovery

2. **Cross-Feature Integration** (`feature-integration.test.ts` - 6 tests):
   - Integration with related features
   - Shared state updates
   - Event propagation

### Manual Testing Checklist

When modifying this feature, manually test:

- [ ] **Happy path**: Feature works as expected with valid inputs
- [ ] **Edge cases**: Boundary values, empty states, max limits
- [ ] **Error handling**: Invalid inputs show appropriate errors
- [ ] **Loading states**: Loading indicators appear correctly
- [ ] **Responsive design**: Works on mobile, tablet, desktop
- [ ] **Browser compatibility**: Chrome, Firefox, Safari, Edge
- [ ] **Performance**: No lag with large datasets
- [ ] **Accessibility**: Screen reader support, keyboard navigation

---

## 🔗 Related Features

| Feature ID | Name              | Relationship    | Impact                   |
| ---------- | ----------------- | --------------- | ------------------------ |
| #F001      | [Related Feature] | Depends on      | High - shares data model |
| #F002      | [Another Feature] | Integrates with | Medium - API calls       |
| #F003      | [Third Feature]   | Triggers        | Low - event notification |

**Dependency Graph**:

```
F001 (Foundation)
  ↓
F00X (This Feature) ← depends on F001
  ↓
F002 (Consumer) ← depends on F00X
```

**Cross-Feature Data Flow**:

```
[Feature A] → produces data
    ↓
[This Feature] → transforms/processes
    ↓
[Feature B] → consumes result
```

---

## 🐛 Known Issues

### Issue 1: [Description]

- **Status**: Open/In Progress/Fixed
- **Severity**: Critical/High/Medium/Low
- **Reported**: YYYY-MM-DD
- **Affects**: Components/Services/All
- **Workaround**: [Temporary solution if available]
- **Fix**: [Link to PR or description of fix]

### Issue 2: Performance with Large Datasets

- **Status**: Acknowledged
- **Severity**: Medium
- **Description**: List rendering slows with >1000 items
- **Workaround**: Implement pagination or virtualization
- **Fix**: Planned for Q2 2026

**If no issues**: None currently

---

## 📝 Future Enhancements

### Planned (Q1 2026)

- [ ] **Enhancement 1**: Add bulk operations support
  - **Complexity**: Medium
  - **Files affected**: service, component, API route
  - **Dependencies**: None

- [ ] **Enhancement 2**: Implement real-time updates via WebSockets
  - **Complexity**: High
  - **Files affected**: Multiple
  - **Dependencies**: WebSocket infrastructure

### Under Consideration

- [ ] Export/import functionality
- [ ] Advanced filtering options
- [ ] Customizable views

### Rejected

- ~~Feature X~~ - Complexity outweighs benefits

---

## 📚 Additional References

### Documentation

- **Agent docs**: `agents/feature-name.md` (AI agent instructions)
- **API docs**: `docs/api/feature-endpoints.md` (API reference)
- **User docs**: `docs/user-guide/feature.md` (end-user guide)

### External Resources

- **Design mockups**: [Figma link]
- **Requirements doc**: [Notion/Confluence link]
- **Architecture decision**: [ADR link]

### Related Code

- **Similar patterns**: See Feature #F00Y for similar implementation
- **Reusable components**: Check `src/components/shared/` for utilities

---

## 🔧 Maintenance Notes

### Performance Considerations

- **Database queries**: Uses indexes on `feature_id`, `created_at`
- **Caching**: Results cached for 5 minutes in Redis
- **Rate limiting**: 100 requests/minute per user

### Security Notes

- **Authentication**: JWT required for all endpoints
- **Authorization**: Role-based access control (RBAC)
- **Input validation**: All inputs sanitized and validated
- **SQL injection**: Using parameterized queries

### Deployment Notes

- **Environment variables** required:
  - `FEATURE_API_KEY`
  - `FEATURE_DATABASE_URL`
- **Database migrations**: Run migrations before deployment
- **Feature flags**: Controlled by `ENABLE_FEATURE_X` flag

---

## 📊 Metrics & Analytics

### Usage Statistics

- **Active users**: [Number] (as of [date])
- **API calls**: [Number]/day average
- **Error rate**: [Percentage]
- **Average response time**: [ms]

### Performance Benchmarks

- **Load time**: <500ms (target)
- **Time to interactive**: <1s (target)
- **API response time**: <100ms (p95)

---

## ✅ Documentation Status

**Last Verified**: YYYY-MM-DD  
**Verified By**: @username  
**Accuracy**: ✅ Up to date | ⚠️ Partially outdated | ❌ Outdated

**Verification Checklist**:

- [x] All files still exist at documented locations
- [x] Integration points verified with code
- [x] Data flow matches actual implementation
- [x] Test coverage numbers accurate
- [x] Git references correct
- [x] Related features list updated

---

## 💡 Tips for Agents

### Quick Discovery

```bash
# Find this feature's files quickly
grep -r "F00X" docs/features/

# See recent changes
git log --grep="F00X" --oneline -10

# Check test coverage
npm run test:coverage -- MainComponent
```

### Common Modifications

- **Add field**: Update interface → validator → component → tests
- **Change API**: Route → service → component → tests
- **Fix bug**: Identify file from error → read context → fix → test

### Token-Efficient Reading

1. Read Quick Summary first (100 tokens)
2. Scan File Map for relevant files (200 tokens)
3. Jump to Integration Points if needed (300 tokens)
4. Read Modification Guide for your task (400 tokens)

**Total: ~1,000 tokens vs 20,000+ for discovery**

---

**Questions or corrections?** Update this doc or ping @owner
