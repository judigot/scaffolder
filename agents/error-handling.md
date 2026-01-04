---
name: error-handling
description: Use this agent when you need to understand or implement error handling patterns, server configuration status tracking, or false-positive prevention in the UI. Examples:

<example>
Context: User needs to implement atomic error handling
user: "How do I handle errors atomically in React without race conditions?"
assistant: "I'll use the error-handling agent to explain the useAtomicError hook and atomic error state management patterns."
<commentary>
This triggers because the user needs error handling implementation guidance.
</commentary>
</example>

<example>
Context: User is seeing false-positive error messages
user: "Why is the UI showing 'GitHub Token Required' when Auth0 isn't configured?"
assistant: "I'll use the error-handling agent to explain the server configuration status tracking and false-positive prevention patterns."
<commentary>
This triggers because the user needs to understand configuration-aware error handling.
</commentary>
</example>

model: inherit
color: red
tools: ["Read", "Write", "Grep"]
---
# Agent Error Handling and Server Configuration - Context Guide

This document provides essential context about the error handling system and server configuration management for AI agents working on this codebase.

## Overview

The application implements enterprise-grade error handling with atomic operations and intelligent server configuration detection to prevent false-positive error messages and provide accurate user feedback.

## Core Architecture

### 1. Atomic Error Handling System

**Location**: `src/hooks/useAtomicError.ts`

A React hook that provides atomic error state management, ensuring error messages are set and cleared atomically to prevent race conditions and conflicting UI states.

#### Key Features

- **Atomic Operations**: All state updates are batched atomically (React 18+)
- **Race Condition Prevention**: Uses operation IDs to track latest operation
- **Mutual Exclusivity**: Success and error messages cannot coexist
- **Transactional**: Operations are all-or-nothing
- **Automatic Cleanup**: Setting new error/success clears previous messages

#### API

```typescript
const {
  error,                    // Current error message (string | null)
  successMessage,          // Current success message (string | null)
  setError,                // Atomically set error (clears success)
  clearError,              // Atomically clear error
  setSuccess,              // Atomically set success (clears error)
  clearSuccess,            // Atomically clear success
  clearAll,                // Atomically clear both
  executeWithErrorHandling // Execute async operation with atomic error handling
} = useAtomicError();
```

#### Usage Example

```typescript
const { error, successMessage, executeWithErrorHandling } = useAtomicError();

// Simple usage
setError('Something went wrong');
setSuccess('Operation completed');

// Atomic async operation
await executeWithErrorHandling(
  async () => {
    return await saveData();
  },
  {
    successMessage: 'Data saved successfully',
    errorMessage: (err) => `Failed to save: ${err.message}`,
    onSuccess: (result) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    }
  }
);
```

#### Implementation Details

- **Operation IDs**: Uses `useRef` to track operation sequence numbers
- **React Batching**: Leverages React 18+ automatic batching for atomic state updates
- **Concurrent Operation Handling**: Only processes results from the latest operation, ignoring stale results

### 2. Server Configuration Status Tracking

**Location**: `src/hooks/useUser.ts`, `src/app/routes/userMetadata.ts`, `src/app/routes/githubToken.ts`

The system tracks server configuration status to distinguish between user-facing errors and server configuration issues.

#### Configuration Status Structure

```typescript
interface IServerConfigStatus {
  auth0ManagementApiConfigured?: boolean;
}
```

#### API Integration

Both `/api/user-metadata` and `/api/github-token` endpoints return `serverConfigStatus` in their responses:

```typescript
{
  success: true,
  metadata: {...},
  serverConfigStatus: {
    auth0ManagementApiConfigured: true | false
  }
}
```

#### Hook Integration

The `useUser` hook exposes `serverConfigStatus` and `isLoading`:

```typescript
const {
  serverConfigStatus,  // IServerConfigStatus | null
  isLoading,           // boolean - true while TanStack Query is fetching
  // ... other properties
} = useUser();
```

**Important**: `serverConfigStatus` is derived from TanStack Query responses:
- `tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus ?? null`
- Both queries (`userMetadata` and `githubToken`) run in parallel
- `isLoading` is `true` while either query is loading
- **Always check `!isLoading && serverConfigStatus !== null` before using `serverConfigStatus` to prevent race conditions**

#### Backend Implementation

**Location**: `src/app/services/auth0Service.ts`

- **`isAuth0ManagementApiConfigured()`**: Returns boolean indicating if Auth0 Management API is configured
- **`getAuth0ManagementApiConfigStatus()`**: Returns detailed status with list of missing variables

```typescript
export function getAuth0ManagementApiConfigStatus(): {
  configured: boolean;
  missing: string[];
} {
  // Checks VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, 
  // AUTH0_MANAGEMENT_API_CLIENT_SECRET
  // Returns which variables are missing
}
```

### 3. False-Positive Prevention

**Location**: `src/components/FileViewer.tsx`

The system prevents false-positive error messages by checking server configuration before showing user-facing errors.

#### Problem

When Auth0 Management API is not configured:
- `githubToken` will be `null` (API can't fetch it)
- Showing "GitHub Token Required" would be misleading
- Real issue is server configuration, not missing user token

#### Solution

```typescript
// CRITICAL: Wait for loading to complete and ensure we have data
// This prevents race conditions where serverConfigStatus is null during initial load
const isAuth0Configured =
  !isUserLoading &&
  serverConfigStatus !== null &&
  serverConfigStatus.auth0ManagementApiConfigured === true;
const hasGitHubToken =
  isAuth0Configured &&
  githubToken !== null &&
  githubToken !== '';

// Only show banner if Auth0 is configured AND token is missing
{!isUserLoading &&
  serverConfigStatus !== null &&
  !hasGitHubToken &&
  isAuth0Configured && (
  <div>GitHub Token Required</div>
)}
```

#### Error Handling Flow

1. **Check server configuration first**: `isAuth0Configured`
2. **Only then check user data**: `hasGitHubToken`
3. **Show appropriate message**: Server config error vs. user token error

### 4. Conditional Menu Item Rendering

**Location**: `src/components/UserProfile.tsx`

Menu items that require Auth0 Management API are conditionally rendered based on server configuration status.

#### Implementation

```typescript
{!isLoading &&
  serverConfigStatus !== null &&
  serverConfigStatus.auth0ManagementApiConfigured === true && (
  <>
    <button onClick={() => handleSetActivePanel('githubToken')}>
      Add GitHub Token
    </button>
    <button onClick={() => handleSetActivePanel('env')}>
      Environment Variables
    </button>
  </>
)}
```

#### Panel Navigation Prevention

The system prevents navigation to panels that require Auth0 Management API when it's not configured:

```typescript
useEffect(() => {
  if (storeIsOpen) {
    setIsOpen(true);
    // Redirect to home if trying to access panels that require Auth0 Management API
    if (
      !isLoading &&
      serverConfigStatus !== null &&
      (storeActivePanel === 'githubToken' || storeActivePanel === 'env') &&
      serverConfigStatus.auth0ManagementApiConfigured === false
    ) {
      setActivePanel('home');
      setStoreActivePanel('home');
    } else {
      setActivePanel(storeActivePanel);
    }
  }
}, [storeIsOpen, storeActivePanel, serverConfigStatus, isLoading]);
```

### 5. Developer-Facing UI Indicators

**Location**: `src/App.tsx`, `src/components/UserProfile.tsx`

Developer-facing banners show server configuration status to help developers identify configuration issues.

#### Implementation

```typescript
{serverConfigStatus?.auth0ManagementApiConfigured === false && (
  <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
    <div className="flex items-start gap-2">
      <svg className="w-5 h-5 text-red-400">...</svg>
      <div className="flex-1">
        <p className="text-sm font-medium text-red-300">
          Developer Notice: Server Configuration Missing
        </p>
        <p className="text-xs text-red-200/80 mt-1">
          Auth0 Management API credentials are not configured...
          Set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, 
          and AUTH0_MANAGEMENT_API_CLIENT_SECRET in your .env file.
        </p>
      </div>
    </div>
  </div>
)}
```

#### Display Locations

- **Navbar Banner** (`src/App.tsx`): Sticky banner at the top of the page, above the main navigation
  - Shows when `!isUserLoading && serverConfigStatus !== null && serverConfigStatus.auth0ManagementApiConfigured === false`
  - Black background with red border for high visibility
  - Positioned above the "Scaffolder - Write Once, Generate Forever!" heading
- **UserProfile Home Panel**: Removed (banner moved to navbar for better visibility)
- **UserProfile GitHub Token Panel**: Removed (banner moved to navbar)

#### Styling

- **Red theme**: Indicates developer/server configuration issue
- **Clear messaging**: Lists exact environment variables needed
- **Actionable**: Provides specific guidance on what to set

### 6. Custom Error Classes

**Location**: `src/app/services/auth0Service.ts`

Custom error class for better error identification:

```typescript
export class Auth0ManagementApiNotConfiguredError extends Error {
  constructor() {
    super(
      'Auth0 Management API credentials are missing. Please set VITE_AUTH0_DOMAIN, AUTH0_MANAGEMENT_API_CLIENT_ID, and AUTH0_MANAGEMENT_API_CLIENT_SECRET environment variables.'
    );
    this.name = 'Auth0ManagementApiNotConfiguredError';
  }
}
```

#### Usage

- Thrown when Auth0 Management API credentials are missing
- Caught in API routes and converted to appropriate HTTP responses
- Logged on server console for debugging
- Not shown to end users (gracefully handled)

## Data Flow

### Server Configuration Status Flow

1. **Backend Check**: `getAuth0ManagementApiConfigStatus()` checks environment variables
2. **API Response**: Status included in `/user-metadata` and `/github-token` responses
3. **Hook Extraction**: `useUser` hook extracts `serverConfigStatus` from API responses
4. **Component Usage**: Components check `serverConfigStatus` before showing errors
5. **UI Display**: Developer-facing banners show configuration status

### Error Handling Flow

1. **Operation Starts**: `executeWithErrorHandling` clears previous messages
2. **Operation Executes**: Async operation runs
3. **Operation Completes**: Success or error handler called
4. **State Update**: Atomic state update (error or success message)
5. **UI Update**: Component displays appropriate message

## Key Files

1. **`src/hooks/useAtomicError.ts`**: Atomic error handling hook
2. **`src/hooks/useUser.ts`**: User hook with server configuration status and loading states
3. **`src/app/services/auth0Service.ts`**: Auth0 service with configuration checks
4. **`src/app/routes/userMetadata.ts`**: User metadata API with status
5. **`src/app/routes/githubToken.ts`**: GitHub token API with status
6. **`src/components/FileViewer.tsx`**: False-positive prevention logic
7. **`src/components/UserProfile.tsx`**: Conditional menu item rendering and panel navigation prevention
8. **`src/App.tsx`**: Navbar banner for developer notices

## Error Handling Patterns

### Pattern 1: Atomic Error State

```typescript
const { error, setError, clearError } = useAtomicError();

// Set error (automatically clears success)
setError('Operation failed');

// Clear error
clearError();
```

### Pattern 2: Atomic Async Operation

```typescript
const { executeWithErrorHandling } = useAtomicError();

await executeWithErrorHandling(
  async () => {
    // Your async operation
    return await apiCall();
  },
  {
    successMessage: 'Success!',
    errorMessage: 'Failed to complete operation',
    onSuccess: (result) => {
      // Handle success
    }
  }
);
```

### Pattern 3: Server Configuration Check (with Loading State)

```typescript
const { serverConfigStatus, isLoading } = useUser();

// CRITICAL: Always wait for loading to complete and check for null
// This prevents race conditions where data hasn't loaded yet
if (isLoading || serverConfigStatus === null) {
  // Still loading, don't render conditional UI yet
  return null;
}

// Now safe to check configuration
if (serverConfigStatus.auth0ManagementApiConfigured === false) {
  // Show developer-facing error, not user-facing error
  return;
}

// Safe to check user data
if (!hasGitHubToken) {
  // Show user-facing error
}
```

### Pattern 4: Conditional Menu Item Rendering

```typescript
const { serverConfigStatus, isLoading } = useUser();

// Only show menu items when Auth0 Management API is configured
{!isLoading &&
  serverConfigStatus !== null &&
  serverConfigStatus.auth0ManagementApiConfigured === true && (
  <>
    <button onClick={() => handleSetActivePanel('githubToken')}>
      Add GitHub Token
    </button>
    <button onClick={() => handleSetActivePanel('env')}>
      Environment Variables
    </button>
  </>
)}
```

### Pattern 5: Panel Navigation Prevention

```typescript
useEffect(() => {
  if (storeIsOpen) {
    setIsOpen(true);
    // Redirect to home if trying to access panels that require Auth0 Management API
    if (
      !isLoading &&
      serverConfigStatus !== null &&
      (storeActivePanel === 'githubToken' || storeActivePanel === 'env') &&
      serverConfigStatus.auth0ManagementApiConfigured === false
    ) {
      setActivePanel('home');
      setStoreActivePanel('home');
    } else {
      setActivePanel(storeActivePanel);
    }
  }
}, [storeIsOpen, storeActivePanel, serverConfigStatus, isLoading]);
```

## Recent Changes

### Atomic Error Handling System

- Created `useAtomicError` hook for atomic error state management
- Prevents race conditions in error handling
- Ensures mutual exclusivity between success and error messages
- Provides `executeWithErrorHandling` for atomic async operations

### Server Configuration Status Tracking

- Added `serverConfigStatus` to API responses (`/user-metadata`, `/github-token`)
- Exposed `serverConfigStatus` in `useUser` hook
- Created `getAuth0ManagementApiConfigStatus()` for detailed status
- Added `Auth0ManagementApiNotConfiguredError` custom error class

### False-Positive Prevention

- Updated `FileViewer` to check `serverConfigStatus` before showing "GitHub Token Required"
- Banner only shows when Auth0 is configured AND token is missing
- Prevents misleading error messages when server configuration is the issue

### Developer-Facing UI Indicators

- Added navbar banner in `App.tsx` for immediate visibility
- Shows server configuration status (Auth0 Management API)
- Red styling for developer/server configuration issues
- Only visible to developers, not end users
- Conditionally renders menu items ("Add GitHub Token", "Environment Variables") based on configuration
- Prevents navigation to panels that require Auth0 Management API when not configured

### Loading State and Race Condition Fixes

- Fixed UI flashing during initial render by waiting for `!isLoading && serverConfigStatus !== null`
- Updated all conditional rendering to check loading state first
- Prevents false-positive UI states during TanStack Query data fetching
- Both `userMetadata` and `githubToken` queries must complete before making UI decisions

### Graceful Error Handling

- API routes gracefully handle `Auth0ManagementApiNotConfiguredError`
- Errors logged on server console for debugging
- Returns `null` values instead of throwing errors to end users
- App continues to work without optional features

## Best Practices

### When to Use `useAtomicError`

- âœ… When managing error/success messages in components
- âœ… When handling async operations with error states
- âœ… When preventing race conditions in error handling
- âœ… When ensuring mutual exclusivity of messages

### When to Check Server Configuration

- âœ… Before showing user-facing errors that depend on server config
- âœ… When determining if optional features are available
- âœ… When providing developer feedback about configuration
- âœ… **Always check `!isLoading && serverConfigStatus !== null` first**

### Loading State Handling

#### TanStack Query Integration

The `useUser` hook uses TanStack Query to fetch user metadata and GitHub token in parallel:

```typescript
const {
  data: metadataResult,
  isLoading: metadataLoading,
} = useQuery({
  queryKey: ['userMetadata', auth0User?.sub],
  queryFn: async () => fetchUserMetadata(accessToken),
  // ...
});

const {
  data: tokenData,
  isLoading: tokenLoading,
} = useQuery({
  queryKey: ['githubToken', auth0User?.sub],
  queryFn: async () => fetchGitHubToken(accessToken),
  // ...
});

const isLoading = auth0Loading || metadataLoading || tokenLoading;
const serverConfigStatus =
  tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus ?? null;
```

#### Race Condition Prevention

**Problem**: During initial render, `serverConfigStatus` is `null` while queries are loading. If we check `serverConfigStatus?.auth0ManagementApiConfigured !== false`, it evaluates to `true` (because `undefined !== false`), causing UI to flash incorrectly.

**Solution**: Always check loading state and null before using `serverConfigStatus`:

```typescript
// âŒ WRONG - Will flash during loading
const isConfigured = serverConfigStatus?.auth0ManagementApiConfigured === true;

// âœ… CORRECT - Waits for data to load
const isConfigured =
  !isLoading &&
  serverConfigStatus !== null &&
  serverConfigStatus.auth0ManagementApiConfigured === true;
```

#### Why Both Queries Matter

- Both `/user-metadata` and `/github-token` endpoints return `serverConfigStatus`
- Queries run in parallel and may complete at different times
- Use `tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus` to get the first available value
- Wait for `isLoading` to be `false` before making UI decisions

### When to Show Developer-Facing Errors

- âœ… Server configuration issues (missing environment variables)
- âœ… System-level problems (not user action problems)
- âœ… Issues that require developer intervention

### When to Show User-Facing Errors

- âœ… User action failures (missing GitHub token, invalid input)
- âœ… Issues users can resolve themselves
- âœ… Problems with user-specific data

## Related Documentation

- [Agent Health Check System](./Agent%20Health%20Check%20System.md) - Health check endpoint implementation
- [Agent Project Builder](./Agent%20Project%20Builder.md) - Project builder system context


