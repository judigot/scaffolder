---
id: testing-strategy-spec
type: guide
domain: generic
status: stable
version: 1.0.0
---

# Testing Strategy Specification

## Purpose

Define how AI tools should derive tests from specifications, ensuring every feature includes comprehensive tests. This document establishes the test-first mindset and provides mapping strategies.

## When to use

Reference this document when:
- Planning tests for a new feature
- Reviewing test coverage
- Understanding which tests to write for which scenarios
- Ensuring spec-to-test traceability

## Required sections

This guide covers:
- Spec-to-test mapping
- Test types and when to use them
- Minimum expectations
- Syntax and style guidelines
- AI agent checklists

---

## Spec-to-Test Mapping

Every specification element must have corresponding tests. Use this mapping:

### From Feature Specs

| Spec Element | Test Type | Coverage |
|--------------|-----------|----------|
| User Story | Integration / E2E | At least 1 test per story |
| Acceptance Criterion (Given/When/Then) | Integration | 1 test per scenario |
| Edge Case | Unit / Integration | 1 test per edge case |
| Non-functional requirement | Unit / Integration / E2E | 1 test per requirement |

### From API Specs

| Spec Element | Test Type | Coverage |
|--------------|-----------|----------|
| Endpoint (happy path) | Integration | 1 test per endpoint |
| Validation rule | Unit | 1 test per rule |
| Error scenario | Integration | 1 test per error code |
| Security requirement | Integration | 1 test per requirement |

### From UI Specs

| Spec Element | Test Type | Coverage |
|--------------|-----------|----------|
| Component | Unit | 1 test suite per component |
| State | Unit | 1 test per state |
| State transition | Integration | 1 test per transition |
| Interaction flow | Integration / E2E | 1 test per flow |
| Accessibility requirement | Unit / Integration | 1 test per requirement |

---

## Test Types

### Unit Tests

**Purpose:** Verify isolated pieces of logic work correctly.

**When to use:**

- Business logic functions
- Validation logic
- Data transformations
- Utility functions
- Component rendering (isolated)
- State management logic

**Characteristics:**

- Fast execution (< 10ms each)
- No external dependencies (database, network, file system)
- Mock all dependencies
- Test single unit of behavior

**Example structure:**

```typescript
describe("[UnitName]", () => {
  describe("[methodName]", () => {
    it("should [expected behavior] when [condition]", async () => {
      const input = createTestInput();
      
      const result = await unitUnderTest.methodName(input);
      
      expect(result).toEqual(expectedOutput);
    });

    it("should throw [ErrorType] when [invalid condition]", async () => {
      const invalidInput = createInvalidInput();
      
      await expect(unitUnderTest.methodName(invalidInput))
        .rejects.toThrow(ErrorType);
    });
  });
});
```

---

### Integration Tests

**Purpose:** Verify multiple units work together correctly.

**When to use:**

- API endpoint handlers
- Database operations
- Service interactions
- Component interactions
- User flows within a feature

**Characteristics:**

- Moderate execution time (< 1s each)
- May use real database (test instance)
- May use real services (containerized)
- Test integration points

**Example structure:**

```typescript
describe("[Feature] Integration", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe("POST /api/resource", () => {
    it("should create resource and return 201", async () => {
      const requestBody = createValidRequest();
      
      const response = await request(app)
        .post("/api/resource")
        .send(requestBody)
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: expect.any(String),
        ...requestBody
      });
      
      const savedResource = await database.findById(response.body.id);
      expect(savedResource).toBeDefined();
    });

    it("should return 400 when validation fails", async () => {
      const invalidRequest = { title: "" };
      
      const response = await request(app)
        .post("/api/resource")
        .send(invalidRequest)
        .expect(400);
      
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
```

---

### End-to-End (E2E) Tests

**Purpose:** Verify complete user journeys work correctly.

**When to use:**

- Critical user paths
- Checkout/payment flows
- Authentication flows
- Cross-feature interactions
- Regression prevention for core features

**Characteristics:**

- Slow execution (seconds per test)
- Full application stack
- Real browser (for web apps)
- Test from user perspective

**Example structure:**

```typescript
describe("User Authentication E2E", () => {
  beforeEach(async () => {
    await browser.navigateTo("/login");
  });

  it("should allow user to login and access dashboard", async () => {
    await page.fill("[data-testid=email]", "user@example.com");
    await page.fill("[data-testid=password]", "correctPassword");
    await page.click("[data-testid=submit]");
    
    await page.waitForNavigation();
    
    expect(page.url()).toContain("/dashboard");
    expect(await page.textContent("h1")).toBe("Welcome back, User");
  });

  it("should show error on invalid credentials", async () => {
    await page.fill("[data-testid=email]", "user@example.com");
    await page.fill("[data-testid=password]", "wrongPassword");
    await page.click("[data-testid=submit]");
    
    expect(await page.textContent("[role=alert]"))
      .toBe("Invalid email or password");
    expect(page.url()).toContain("/login");
  });
});
```

---

### Contract Tests

**Purpose:** Verify API contracts between services remain compatible.

**When to use:**

- Microservice boundaries
- Public APIs with external consumers
- Frontend-backend contracts
- Third-party integrations

**Characteristics:**

- Verify request/response shapes
- No business logic testing
- Focus on structural compatibility
- Can run independently by consumer and provider

**Example structure:**

```typescript
describe("Tasks API Contract", () => {
  describe("GET /api/tasks response", () => {
    it("should match expected schema", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .expect(200);
      
      expect(response.body).toMatchSchema({
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "title", "status"],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                status: { enum: ["pending", "in_progress", "completed"] }
              }
            }
          },
          pagination: {
            type: "object",
            required: ["page", "limit", "total"]
          }
        }
      });
    });
  });
});
```

---

### Snapshot / Visual Tests

**Purpose:** Detect unintended visual or structural changes.

**When to use:**

- UI component appearance
- Generated output (HTML, JSON)
- Complex data structures
- Documentation output

**Characteristics:**

- Compare against saved baseline
- Require manual review on changes
- Good for catching regressions
- Can be noisy if overused

**Example structure:**

```typescript
describe("TaskCard", () => {
  it("should match snapshot for pending task", () => {
    const task = createTask({ status: "pending" });
    
    const result = render(<TaskCard task={task} />);
    
    expect(result.container).toMatchSnapshot();
  });

  it("should match snapshot for completed task", () => {
    const task = createTask({ status: "completed" });
    
    const result = render(<TaskCard task={task} />);
    
    expect(result.container).toMatchSnapshot();
  });
});
```

---

## Minimum Expectations

### Naming Conventions

**Test Files:**

| Source File | Test File |
|-------------|-----------|
| `taskService.ts` | `taskService.test.ts` |
| `TaskCard.tsx` | `TaskCard.test.tsx` |
| `api/tasks.ts` | `api/tasks.integration.test.ts` |
| E2E tests | `e2e/[feature].e2e.test.ts` |

**Test Cases:**

Use descriptive names following the pattern:

```
should [expected behavior] when [condition]
```

Examples:
- `should return empty array when no tasks exist`
- `should throw ValidationError when title is empty`
- `should redirect to login when session expired`

**Test Suites:**

Use `describe` blocks to group related tests:

```typescript
describe("[Module/Component Name]", () => {
  describe("[method/feature]", () => {
    it("should [behavior] when [condition]", () => {});
  });
});
```

### Coverage Expectations

| Area | Minimum Coverage | Critical Path Coverage |
|------|-----------------|----------------------|
| Business logic | 80% | 100% |
| API handlers | 80% | 100% |
| UI components | 70% | 100% |
| Utilities | 90% | 100% |
| Overall | 75% | - |

**Critical paths must have 100% coverage:**
- Authentication flows
- Payment processing
- Data mutations
- Authorization checks

---

## Syntax and Style

### Modern TypeScript/JavaScript Style

Use modern async/await syntax:

```typescript
it("should fetch and return tasks", async () => {
  const mockTasks = [createTask(), createTask()];
  mockDatabase.findAll.mockResolvedValue(mockTasks);
  
  const result = await taskService.getAll();
  
  expect(result).toEqual(mockTasks);
});
```

### Arrange-Act-Assert Pattern

Structure every test with clear sections:

```typescript
it("should calculate total with discount", () => {
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ];
  const discount = 0.1;
  
  const total = calculateTotal(items, discount);
  
  expect(total).toBe(225);
});
```

### Descriptive Test Data

Create meaningful test data:

```typescript
const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task_test_123",
  title: "Test Task",
  description: "A task for testing",
  status: "pending",
  priority: "medium",
  dueDate: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

it("should mark overdue tasks", () => {
  const overdueTask = createTask({
    dueDate: "2020-01-01T00:00:00Z",
    status: "pending"
  });
  
  const result = isOverdue(overdueTask);
  
  expect(result).toBe(true);
});
```

### Test Independence

Each test must be independent:

```typescript
describe("TaskService", () => {
  let taskService: TaskService;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    taskService = new TaskService(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

### Avoid Test Antipatterns

| Antipattern | Problem | Solution |
|-------------|---------|----------|
| Testing implementation | Brittle tests | Test behavior, not internals |
| Shared mutable state | Flaky tests | Reset state in beforeEach |
| Sleep/delays | Slow, flaky | Use proper async waiting |
| Testing frameworks | Wasted effort | Trust your dependencies |
| Giant test files | Hard to maintain | Split by feature/component |

---

## Test Organization

### Directory Structure

```
src/
├── features/
│   └── tasks/
│       ├── taskService.ts
│       ├── taskService.test.ts
│       ├── TaskCard.tsx
│       └── TaskCard.test.tsx
├── api/
│   └── tasks/
│       ├── handler.ts
│       └── handler.integration.test.ts
└── tests/
    ├── e2e/
    │   └── tasks.e2e.test.ts
    ├── fixtures/
    │   └── tasks.fixture.ts
    └── helpers/
        └── testUtils.ts
```

### Shared Test Utilities

Create reusable test helpers:

```typescript
export const createAuthenticatedRequest = (
  overrides: Partial<Request> = {}
): Request => ({
  headers: {
    authorization: "Bearer valid_token"
  },
  ...overrides
});

export const expectValidationError = (
  response: Response,
  field: string,
  message: string
) => {
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
  expect(response.body.error.details[field]).toContain(message);
};
```

---

## Deriving Tests from Specs

### Step-by-Step Process

1. **Read the spec completely**
   - Identify all user stories
   - Note all acceptance criteria
   - List all edge cases
   - Record non-functional requirements

2. **Create test plan**
   - Map each spec element to test type
   - Estimate number of tests
   - Prioritize critical paths

3. **Write tests before/alongside code**
   - Start with failing tests
   - Implement until tests pass
   - Refactor while keeping tests green

4. **Verify coverage**
   - Run coverage report
   - Ensure critical paths at 100%
   - Review untested code paths

### Example: Spec to Tests

Given this acceptance criterion:

```gherkin
Scenario: Successful login with valid credentials
  Given I am on the login page
  And I have a registered account with email "user@example.com"
  When I enter "user@example.com" in the email field
  And I enter my correct password
  And I click the "Sign In" button
  Then I am redirected to the dashboard
  And I see a welcome message with my name
```

Derive these tests:

```typescript
describe("Login", () => {
  describe("with valid credentials", () => {
    it("should redirect to dashboard on successful login", async () => {
      const user = await createTestUser({ email: "user@example.com" });
      
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "user@example.com", password: "correctPassword" });
      
      expect(response.status).toBe(200);
      expect(response.body.redirect).toBe("/dashboard");
      expect(response.body.token).toBeDefined();
    });

    it("should return user name in response", async () => {
      const user = await createTestUser({ 
        email: "user@example.com",
        name: "Test User"
      });
      
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "user@example.com", password: "correctPassword" });
      
      expect(response.body.user.name).toBe("Test User");
    });
  });
});

describe("Login E2E", () => {
  it("should complete login flow and show welcome message", async () => {
    await page.goto("/login");
    await page.fill("[data-testid=email]", "user@example.com");
    await page.fill("[data-testid=password]", "correctPassword");
    await page.click("[data-testid=submit]");
    
    await page.waitForURL("**/dashboard");
    
    const welcomeText = await page.textContent("[data-testid=welcome]");
    expect(welcomeText).toContain("Test User");
  });
});
```

---

## Checklist for AI Agents

### Before Writing Tests

- [ ] Read entire relevant spec
- [ ] Identify all acceptance criteria
- [ ] List all edge cases to test
- [ ] Understand non-functional requirements
- [ ] Determine test types needed

### While Writing Tests

- [ ] Each user story has at least one test
- [ ] Each edge case has a test
- [ ] Each API endpoint has happy path test
- [ ] Each validation rule has a test
- [ ] Each error scenario has a test
- [ ] Tests follow naming conventions
- [ ] Tests use Arrange-Act-Assert pattern
- [ ] Tests are independent

### After Writing Tests

- [ ] All tests pass
- [ ] Coverage meets minimums
- [ ] Critical paths at 100%
- [ ] No flaky tests
- [ ] Test output is readable
- [ ] Tests can run in any order

### Feature "Tested" Checklist

Before marking a feature as tested, verify:

- [ ] Unit tests cover business logic
- [ ] Integration tests cover API endpoints
- [ ] Error scenarios tested
- [ ] Edge cases from spec tested
- [ ] Accessibility tests pass (for UI)
- [ ] Performance tests pass (if specified)
- [ ] Security tests pass (if specified)
- [ ] All tests pass in CI
- [ ] Coverage report reviewed

