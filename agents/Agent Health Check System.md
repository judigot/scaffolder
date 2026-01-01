# Agent Health Check System - Context Guide

This document provides essential context about the health check system for AI agents working on this codebase.

## Overview

The health check system provides enterprise-grade monitoring endpoints that validate environment variable configuration and system operational state. All checks are executed atomically (in parallel, independently) with no shared state or side effects, ensuring accurate and fast health status reporting.

## Core Architecture

### Main Entry Point
- **`src/app/routes/health.ts`**: Main health check router
  - Defines three endpoints: `/api/health`, `/api/health/live`, `/api/health/ready`
  - Executes all checks in parallel using `Promise.all()`
  - Returns structured JSON responses with individual check results
  - Registers at `/api/health` in the main router (`src/app/routes/index.ts`)

### Key Components

#### 1. Individual Check Functions

Each environment variable has its own atomic check function:

- **`checkViteAuth0Domain()`**: Validates `VITE_AUTH0_DOMAIN` (critical)
- **`checkViteAuth0ClientId()`**: Validates `VITE_AUTH0_CLIENT_ID` (critical)
- **`checkViteAuth0Audience()`**: Validates `VITE_AUTH0_AUDIENCE` (critical)
- **`checkEncryptionKey()`**: Validates `ENCRYPTION_KEY` with hex format validation (warning)
- **`checkAuth0ManagementApiClientId()`**: Validates `AUTH0_MANAGEMENT_API_CLIENT_ID` (warning)
- **`checkAuth0ManagementApiClientSecret()`**: Validates `AUTH0_MANAGEMENT_API_CLIENT_SECRET` (warning)
- **`checkLiveness()`**: Process liveness check (critical)

#### 2. Generic Check Function

**`checkEnvironmentVariable(varName, options)`**: Generic function that:
- Reads `process.env[varName]`
- Validates value is not undefined, empty, or whitespace-only
- Runs custom validator if provided (e.g., hex format for `ENCRYPTION_KEY`)
- Returns standardized `IHealthCheck` object with name, status, duration, severity, and message

#### 3. Response Structure

```typescript
interface IHealthCheck {
  name: string;              // Lowercase variable name (e.g., "vite_auth0_domain")
  status: 'pass' | 'fail';
  duration: number;          // Milliseconds
  severity?: 'critical' | 'warning' | 'info';
  message?: string;          // Human-readable description
}

interface IHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;         // ISO 8601 format
  version?: string;
  checks: IHealthCheck[];
}
```

## Status Determination Logic

The overall status is determined by:

1. **Unhealthy**: Any critical check fails
2. **Degraded**: All critical checks pass, but some warning checks fail
3. **Healthy**: All checks pass

HTTP status codes:
- `200`: Healthy or degraded (can still serve requests)
- `503`: Unhealthy (should not receive traffic)

## Endpoints

### GET `/api/health`

Full health check with all individual environment variable checks.

**Execution Flow**:
1. All checks execute in parallel via `Promise.all()`
2. Results are collected into `checks` array
3. Status is determined based on critical vs warning failures
4. Response includes all individual check results

**Performance**: < 5ms total (all checks in parallel)

### GET `/api/health/live`

Liveness probe for orchestration systems (Kubernetes, Docker).

**Returns**: Simple JSON indicating process is alive
**Always**: HTTP 200 (if endpoint is reachable, process is alive)

### GET `/api/health/ready`

Readiness probe for load balancers.

**Checks**: Only critical variables (`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`)
**Returns**: Status and individual variable configuration state
**HTTP Codes**: 200 (ready) or 503 (not ready)

## Validation Logic

### Standard Validation

All variables check for:
- `undefined` value
- Empty string (`''`)
- Whitespace-only string (after `trim()`)

### Custom Validation

`ENCRYPTION_KEY` includes additional validation:
- Must be exactly 64 characters
- Must be valid hex string (regex: `/^[0-9a-fA-F]{64}$/`)
- Returns specific error message if validation fails

## Atomic Execution Principles

All checks follow atomic operation principles:

1. **Isolation**: Each check function is independent
2. **No Shared State**: Checks don't modify global state
3. **Parallel Execution**: All checks run simultaneously
4. **Error Isolation**: One check failing doesn't affect others
5. **Read-Only**: Only reads `process.env`, no side effects

## Integration Points

### Router Registration

Health check router is registered in `src/app/routes/index.ts`:
```typescript
router.route('/health', healthRouter);
```

### Environment Variables

The system checks these environment variables:

**Critical (Required for core functionality)**:
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

**Warning (Optional features)**:
- `ENCRYPTION_KEY` (with format validation)
- `AUTH0_MANAGEMENT_API_CLIENT_ID`
- `AUTH0_MANAGEMENT_API_CLIENT_SECRET`

### Related Services

- **`src/app/services/auth0Service.ts`**: Contains `isAuth0ManagementApiConfigured()` and `getAuth0ManagementApiConfigStatus()` functions
- **`src/utils/serverEncryption.ts`**: Contains `isEncryptionAvailable()` function

## Error Handling

If the health check endpoint itself fails (e.g., exception during execution):

1. Catches error in try-catch block
2. Returns unhealthy status with single check result
3. HTTP status code: 503
4. Includes error message in check result

## Performance Considerations

- **Individual checks**: < 1ms each (in-memory `process.env` read)
- **Total endpoint time**: < 5ms (parallel execution)
- **No caching**: Real-time status preferred for monitoring
- **No database queries**: Only reads environment variables
- **No network calls**: Completely local operations

## Monitoring Integration

### Kubernetes

Example liveness/readiness probe configuration:
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 5000
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 5000
  periodSeconds: 5
```

### Docker

Example healthcheck configuration:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health/live"]
  interval: 10s
```

## Key Files

1. **`src/app/routes/health.ts`**: Main health check implementation
2. **`src/app/routes/index.ts`**: Router registration
3. **`src/app/services/auth0Service.ts`**: Auth0 configuration status helpers
4. **`src/utils/serverEncryption.ts`**: Encryption key validation

## Recent Changes

### Enterprise-Grade Individual Health Checks

- Refactored health check to validate each environment variable individually
- Added severity levels (critical vs warning) for each check
- Implemented custom validation for `ENCRYPTION_KEY` (64-character hex format)
- All checks execute atomically in parallel
- Each check returns detailed message with configuration guidance

## Related Documentation

- [Agent Error Handling and Server Configuration](./Agent%20Error%20Handling%20and%20Server%20Configuration.md) - Error handling system and server configuration management
- [Agent Project Builder](./Agent%20Project%20Builder.md) - Project builder system context

