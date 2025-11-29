---
id: api-spec-template
type: template
domain: generic
status: stable
version: 1.0.0
---

# API / Backend Spec Template

## Purpose

Define how to specify backend and API behavior so AI agents can directly generate implementation code and tests. This template produces machine-readable, unambiguous API contracts.

## When to use

Use this template when:
- Creating new API endpoints
- Modifying existing API behavior
- Documenting backend service contracts
- Planning API-first development

## Required sections

Copy the template below. All sections are required unless marked optional.

---

# Template: [API Name] Specification

```markdown
---
id: [kebab-case-api-id]
type: api-spec
domain: [domain-name]
status: draft | in-review | approved | implemented
version: 1.0.0
base-path: /api/v1
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
---

# [API Name] API

## Overview

[Brief description of what this API does and its primary use cases]

## Authentication

| Method | Header | Format |
|--------|--------|--------|
| [Bearer Token / API Key / etc.] | Authorization | Bearer {token} |

## Endpoints

### [HTTP Method] [Path]

**Description:** [What this endpoint does]

#### Request

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | application/json |
| Authorization | Yes | Bearer token |

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [name] | string | Yes | [Description] |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| [name] | string | No | [default] | [Description] |

**Request Body:**

```typescript
interface [RequestName]Request {
  field1: string;           // Required. [Description]. Min: 1, Max: 100
  field2?: number;          // Optional. [Description]. Range: 0-1000
  field3: "A" | "B" | "C";  // Required. [Description]. Enum values
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["field1", "field3"],
  "properties": {
    "field1": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "[Description]"
    },
    "field2": {
      "type": "number",
      "minimum": 0,
      "maximum": 1000,
      "description": "[Description]"
    },
    "field3": {
      "type": "string",
      "enum": ["A", "B", "C"],
      "description": "[Description]"
    }
  }
}
```

#### Response

**Success Response (200 OK):**

```typescript
interface [ResponseName]Response {
  id: string;
  createdAt: string;  // ISO 8601 format
  [other fields]
}
```

**Response Example:**

```json
{
  "id": "abc123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | VALIDATION_ERROR | [field]: [message] | Invalid request body |
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |
| 403 | FORBIDDEN | Insufficient permissions | Authz failure |
| 404 | NOT_FOUND | [Resource] not found | Resource missing |
| 409 | CONFLICT | [Resource] already exists | Duplicate |
| 429 | RATE_LIMITED | Too many requests | Rate limit hit |
| 500 | INTERNAL_ERROR | Internal server error | Server failure |

**Error Response Shape:**

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;  // Field-level errors
    requestId: string;
  };
}
```

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| [field1] | Required, 1-100 chars | "field1 is required" / "field1 must be 1-100 characters" |
| [field2] | Optional, 0-1000 | "field2 must be between 0 and 1000" |
| [email] | Valid email format | "Invalid email format" |

## Security

### Authentication

- [ ] All endpoints require valid Bearer token
- [ ] Tokens validated against auth service
- [ ] Token expiration enforced

### Authorization

| Endpoint | Required Role/Permission |
|----------|-------------------------|
| GET /resources | read:resources |
| POST /resources | write:resources |
| DELETE /resources/:id | admin:resources |

### Input Sanitization

- [ ] All string inputs trimmed
- [ ] HTML entities escaped
- [ ] SQL injection prevented via parameterized queries
- [ ] Path traversal prevented

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Per user | 100 requests | 1 minute |
| Per IP (unauthenticated) | 20 requests | 1 minute |

## Performance

| Endpoint | Target Latency (p95) | Max Payload |
|----------|---------------------|-------------|
| GET /resources | < 200ms | N/A |
| POST /resources | < 500ms | 1MB |
| GET /resources/:id | < 100ms | N/A |

## Reliability

### Timeouts

| Operation | Timeout |
|-----------|---------|
| Database query | 5s |
| External service call | 10s |
| Total request | 30s |

### Idempotency

| Endpoint | Idempotent | Key |
|----------|------------|-----|
| POST /resources | Yes | X-Idempotency-Key header |
| PUT /resources/:id | Yes | Resource ID |
| DELETE /resources/:id | Yes | Resource ID |

### Retry Behavior

- Clients should retry on 5xx errors with exponential backoff
- Maximum 3 retries
- Initial delay: 1 second

## Testing Requirements

### Unit Tests

- [ ] Request validation logic
- [ ] Response serialization
- [ ] Business logic functions
- [ ] Error handling paths

### Integration Tests

- [ ] Each endpoint happy path
- [ ] Authentication failures
- [ ] Authorization failures
- [ ] Validation error scenarios
- [ ] Database interactions

### Contract Tests

- [ ] Request/response shapes match spec
- [ ] Error responses match spec
- [ ] Status codes correct for each scenario
```

---

## Example

Complete example of a small API specification:

---

```markdown
---
id: tasks-api
type: api-spec
domain: productivity
status: approved
version: 1.0.0
base-path: /api/v1
created: 2024-01-15
updated: 2024-01-20
---

# Tasks API

## Overview

RESTful API for managing user tasks. Supports creating, reading, updating, and deleting tasks with full CRUD operations.

## Authentication

| Method | Header | Format |
|--------|--------|--------|
| Bearer Token | Authorization | Bearer {jwt_token} |

## Endpoints

### GET /tasks

**Description:** Retrieve paginated list of tasks for the authenticated user.

#### Request

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (1-indexed) |
| limit | integer | No | 20 | Items per page (1-100) |
| status | string | No | all | Filter: all, pending, completed |
| sort | string | No | createdAt | Sort field: createdAt, dueDate, priority |
| order | string | No | desc | Sort order: asc, desc |

#### Response

**Success Response (200 OK):**

```typescript
interface GetTasksResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "task_abc123",
      "title": "Complete API spec",
      "description": "Write the full API specification document",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2024-01-20T17:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-16T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | INVALID_PARAMETER | Invalid value for [param] | Bad query param |
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |

---

### POST /tasks

**Description:** Create a new task.

#### Request

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | application/json |
| Authorization | Yes | Bearer token |
| X-Idempotency-Key | No | Client-generated UUID for idempotency |

**Request Body:**

```typescript
interface CreateTaskRequest {
  title: string;          // Required. 1-200 characters
  description?: string;   // Optional. Max 2000 characters
  priority?: "low" | "medium" | "high";  // Optional. Default: medium
  dueDate?: string;       // Optional. ISO 8601 format, must be future
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["title"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "description": {
      "type": "string",
      "maxLength": 2000
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "dueDate": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

#### Response

**Success Response (201 Created):**

```typescript
interface CreateTaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: "pending";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
```

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | VALIDATION_ERROR | title: Title is required | Missing title |
| 400 | VALIDATION_ERROR | title: Must be 1-200 characters | Title too long |
| 400 | VALIDATION_ERROR | dueDate: Must be a future date | Past due date |
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |

---

### GET /tasks/:id

**Description:** Retrieve a single task by ID.

#### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Task ID (prefixed with task_) |

#### Response

**Success Response (200 OK):**

Returns single `Task` object (same shape as in list response).

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |
| 403 | FORBIDDEN | Access denied | Not owner |
| 404 | NOT_FOUND | Task not found | Invalid ID |

---

### PATCH /tasks/:id

**Description:** Update an existing task.

#### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Task ID |

**Request Body:**

```typescript
interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
}
```

All fields optional. Only provided fields are updated.

#### Response

**Success Response (200 OK):**

Returns updated `Task` object.

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | VALIDATION_ERROR | [field]: [message] | Invalid field |
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |
| 403 | FORBIDDEN | Access denied | Not owner |
| 404 | NOT_FOUND | Task not found | Invalid ID |

---

### DELETE /tasks/:id

**Description:** Delete a task.

#### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Task ID |

#### Response

**Success Response (204 No Content):**

Empty response body.

#### Errors

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | UNAUTHORIZED | Invalid or missing token | Auth failure |
| 403 | FORBIDDEN | Access denied | Not owner |
| 404 | NOT_FOUND | Task not found | Invalid ID |

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required, 1-200 chars | "title is required" / "title must be 1-200 characters" |
| description | Optional, max 2000 chars | "description must be at most 2000 characters" |
| priority | Enum: low, medium, high | "priority must be one of: low, medium, high" |
| dueDate | ISO 8601, future date | "dueDate must be a valid ISO 8601 date" / "dueDate must be in the future" |
| status | Enum: pending, in_progress, completed | "status must be one of: pending, in_progress, completed" |

## Security

### Authentication

- [x] All endpoints require valid JWT Bearer token
- [x] Tokens validated via auth service
- [x] Token expiration: 1 hour

### Authorization

| Endpoint | Rule |
|----------|------|
| All | User can only access own tasks |

### Input Sanitization

- [x] All string inputs trimmed
- [x] HTML escaped in title and description
- [x] Parameterized queries for all database operations

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Per user | 100 requests | 1 minute |

## Performance

| Endpoint | Target Latency (p95) | Max Payload |
|----------|---------------------|-------------|
| GET /tasks | < 150ms | N/A |
| GET /tasks/:id | < 50ms | N/A |
| POST /tasks | < 200ms | 10KB |
| PATCH /tasks/:id | < 200ms | 10KB |
| DELETE /tasks/:id | < 100ms | N/A |

## Reliability

### Timeouts

| Operation | Timeout |
|-----------|---------|
| Database query | 5s |
| Total request | 10s |

### Idempotency

| Endpoint | Idempotent | Key |
|----------|------------|-----|
| POST /tasks | Yes | X-Idempotency-Key header |
| PATCH /tasks/:id | Yes | Task ID + request body hash |
| DELETE /tasks/:id | Yes | Task ID |

## Testing Requirements

### Unit Tests

- [ ] CreateTaskRequest validation
- [ ] UpdateTaskRequest validation
- [ ] Query parameter parsing
- [ ] Pagination calculation
- [ ] Task entity transformations

### Integration Tests

- [ ] GET /tasks returns paginated results
- [ ] GET /tasks filters by status correctly
- [ ] GET /tasks sorts correctly
- [ ] POST /tasks creates task and returns 201
- [ ] POST /tasks with idempotency key prevents duplicates
- [ ] GET /tasks/:id returns correct task
- [ ] GET /tasks/:id returns 404 for invalid ID
- [ ] PATCH /tasks/:id updates only provided fields
- [ ] DELETE /tasks/:id removes task
- [ ] All endpoints reject invalid tokens
- [ ] Users cannot access other users' tasks

### Contract Tests

- [ ] All response shapes match TypeScript interfaces
- [ ] All error responses match ErrorResponse shape
- [ ] Pagination metadata is accurate
```

---

## Checklist for AI Agents

Before implementing:

- [ ] Read entire API spec including all endpoints
- [ ] Understand request/response shapes
- [ ] Note all validation rules
- [ ] Identify security requirements
- [ ] Check performance targets

During implementation:

- [ ] Implement each endpoint per spec
- [ ] Add all validation as specified
- [ ] Implement error responses exactly
- [ ] Add authentication/authorization
- [ ] Write tests for each endpoint

After implementation:

- [ ] All endpoints return correct status codes
- [ ] Validation errors match spec messages
- [ ] Integration tests pass
- [ ] Performance targets met
- [ ] Security checklist complete

