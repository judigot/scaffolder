# Testing Plan: Mock Authentication System

## Overview

This document outlines the plan for implementing a mock authentication system that mirrors Auth0's structure, enabling E2E testing without real authentication dependencies.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Environment                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ MockAuthProvider │───▶│ Mock User Data / Fixtures        │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ MSW (Mock API)   │───▶│ /api/user-metadata               │  │
│  │                  │    │ /api/github-token                │  │
│  │                  │    │ /api/agent/chat                  │  │
│  │                  │    │ /api/terraform/status            │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Test Utilities                                            │  │
│  │ - createMockUser()                                        │  │
│  │ - createMockInfraCredentials()                           │  │
│  │ - createMockTerminalSession()                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Mock Data Structures

### 2.1 Mock User (Auth0 User)

```typescript
interface IMockUser {
  sub: string;           // "auth0|mock_user_12345"
  email: string;         // "test@example.com"
  name: string;          // "Test User"
  picture: string;       // "https://example.com/avatar.png"
  email_verified: boolean;
  updated_at: string;
}
```

### 2.2 Mock User Metadata

```typescript
interface IMockUserMetadata {
  env: Record<string, string>;
  infra: {
    sshPublicKey: string;
    sshPrivateKey: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsSessionToken?: string;
    tfcToken: string;
    tfcOrg: string;
    tfcWorkspace: string;
  };
  github_token?: string;
}
```

### 2.3 Mock Access Token

```typescript
interface IMockAccessToken {
  token: string;          // "mock_access_token_xyz"
  expiresIn: number;      // 86400
  tokenType: string;      // "Bearer"
}
```

---

## 3. Test Fixtures

### 3.1 User Scenarios

| Fixture Name              | Description                                    |
|---------------------------|------------------------------------------------|
| `authenticatedUser`       | Fully authenticated with all credentials       |
| `newUser`                 | Authenticated but no infra credentials         |
| `partialInfraUser`        | Has SSH key but no AWS/TFC credentials         |
| `expiredTokenUser`        | User with expired access token                 |
| `disconnectedTerminal`    | User with invalid/offline infrastructure       |
| `encryptedMetadataUser`   | User with encrypted metadata (needs passphrase)|

### 3.2 Infrastructure States

| Fixture Name              | Description                                    |
|---------------------------|------------------------------------------------|
| `provisionedInfra`        | EC2 running, all outputs available             |
| `provisioningInfra`       | Terraform apply in progress                    |
| `failedInfra`             | Terraform apply failed                         |
| `noInfra`                 | No Terraform workspace configured              |

### 3.3 Terminal States

| Fixture Name              | Description                                    |
|---------------------------|------------------------------------------------|
| `connectedTerminal`       | SSH connection active                          |
| `disconnectedTerminal`    | SSH connection failed                          |
| `reconnectingTerminal`    | Connection in progress                         |

---

## 4. Implementation Files

```
src/
├── test/
│   ├── mocks/
│   │   ├── auth/
│   │   │   ├── MockAuthProvider.tsx      # Wraps app for testing
│   │   │   ├── mockAuth0Hook.ts          # Mock useAuth0()
│   │   │   └── mockUserStore.ts          # Mock Zustand store
│   │   │
│   │   ├── api/
│   │   │   ├── handlers.ts               # MSW request handlers
│   │   │   ├── userMetadata.ts           # /api/user-metadata mock
│   │   │   ├── githubToken.ts            # /api/github-token mock
│   │   │   ├── agentChat.ts              # /api/agent/chat mock
│   │   │   └── terraform.ts              # /api/terraform/* mocks
│   │   │
│   │   └── server.ts                     # MSW server setup
│   │
│   ├── fixtures/
│   │   ├── users.ts                      # User fixture factory
│   │   ├── metadata.ts                   # Metadata fixtures
│   │   ├── infra.ts                      # Infrastructure fixtures
│   │   └── terminal.ts                   # Terminal state fixtures
│   │
│   ├── utils/
│   │   ├── renderWithAuth.tsx            # Test render helper
│   │   ├── mockStorage.ts                # localStorage/sessionStorage
│   │   └── testIds.ts                    # Data-testid constants
│   │
│   └── setup.ts                          # Test setup (vitest/playwright)
│
├── e2e/                                  # Playwright tests
│   ├── terminal.spec.ts
│   ├── auth.spec.ts
│   └── fixtures/
│       └── test-auth.ts                  # Playwright auth fixture
```

---

## 5. Mock Auth Provider

```typescript
// src/test/mocks/auth/MockAuthProvider.tsx

interface IMockAuthConfig {
  user?: IMockUser | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  accessToken?: string | null;
  userMetadata?: IMockUserMetadata | null;
  error?: Error | null;
}

export function MockAuthProvider({
  children,
  config = {},
}: {
  children: React.ReactNode;
  config?: IMockAuthConfig;
}) {
  // Provides mock context that matches real Auth0Provider behavior
}
```

---

## 6. MSW API Handlers

### 6.1 User Metadata Handler

```typescript
// GET /api/user-metadata
rest.get('/api/user-metadata', (req, res, ctx) => {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
  }

  return res(ctx.json({
    env: mockUserMetadata.env,
    infra: mockUserMetadata.infra,
  }));
});
```

### 6.2 Terminal/Agent Chat Handler

```typescript
// POST /api/agent/chat
rest.post('/api/agent/chat', async (req, res, ctx) => {
  const { messages, infraCredentials } = await req.json();
  const command = extractCommandFromMessage(messages);

  // Simulate command execution
  return res(
    ctx.status(200),
    ctx.set('Content-Type', 'text/event-stream'),
    ctx.body(createSSEResponse({
      type: 'tool-result',
      result: {
        success: true,
        output: mockCommandOutput(command),
      },
    })),
  );
});
```

---

## 7. Test Scenarios

### 7.1 Terminal Mode Tests

| Test Case                          | Fixture                  | Expected Result                    |
|------------------------------------|--------------------------|-------------------------------------|
| Renders terminal viewport          | `authenticatedUser`      | Dark terminal background visible    |
| Shows disconnected state           | `newUser`                | "Not connected" message displayed   |
| Executes command successfully      | `provisionedInfra`       | Command output shown in terminal    |
| Shows connection error             | `disconnectedTerminal`   | Error message in red                |
| Action buttons respond             | `connectedTerminal`      | YES/NO/INTERRUPT/EXIT work          |
| Command history navigation         | `authenticatedUser`      | Up/Down arrows cycle history        |
| Gesture navigation                 | `authenticatedUser`      | Swipe triggers navigation           |

### 7.2 Auth Flow Tests

| Test Case                          | Fixture                  | Expected Result                    |
|------------------------------------|--------------------------|-------------------------------------|
| Shows login when unauthenticated   | `null`                   | Redirects to Auth0                  |
| Loads user data on auth            | `authenticatedUser`      | User name shown in navbar           |
| Handles token refresh              | `expiredTokenUser`       | Silently refreshes token            |
| Shows encryption prompt            | `encryptedMetadataUser`  | Passphrase modal appears            |

---

## 8. Environment Detection

```typescript
// src/utils/testEnvironment.ts

export const isTestEnvironment = () => {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_MOCK_AUTH === 'true' ||
    typeof window !== 'undefined' && window.__MOCK_AUTH__
  );
};
```

### 8.1 Conditional Provider

```typescript
// src/main.tsx

const AuthProvider = isTestEnvironment()
  ? MockAuthProvider
  : Auth0Provider;
```

---

## 9. Playwright Setup

### 9.1 Installation

```bash
bun add -D @playwright/test
bunx playwright install
```

### 9.2 Configuration

```typescript
// playwright.config.ts

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'VITE_MOCK_AUTH=true bun run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 9.3 Auth Fixture

```typescript
// e2e/fixtures/test-auth.ts

import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Inject mock auth state
    await page.addInitScript(() => {
      window.__MOCK_AUTH__ = {
        user: { sub: 'auth0|test', email: 'test@example.com' },
        accessToken: 'mock_token',
        isAuthenticated: true,
      };
    });

    await use(page);
  },
});
```

---

## 10. Implementation Order

1. **Phase 1: Foundation**
   - [ ] Create mock type definitions
   - [ ] Create user/metadata fixtures
   - [ ] Set up MSW with basic handlers

2. **Phase 2: Mock Auth Provider**
   - [ ] Create MockAuthProvider component
   - [ ] Create mock useAuth0 hook
   - [ ] Create mock useUser/useDecryptedUserMetadata

3. **Phase 3: API Mocks**
   - [ ] Implement /api/user-metadata handlers
   - [ ] Implement /api/github-token handlers
   - [ ] Implement /api/agent/chat handlers
   - [ ] Implement /api/terraform/* handlers

4. **Phase 4: Test Utilities**
   - [ ] Create renderWithAuth helper
   - [ ] Create mock storage utilities
   - [ ] Define data-testid constants

5. **Phase 5: Playwright Integration**
   - [ ] Install and configure Playwright
   - [ ] Create auth fixtures
   - [ ] Write Terminal Mode E2E tests

6. **Phase 6: CI Integration**
   - [ ] Add test scripts to package.json
   - [ ] Configure GitHub Actions workflow
   - [ ] Add test coverage reporting

---

## 11. Success Criteria

- [ ] All terminal UI components render correctly in test environment
- [ ] Mock auth seamlessly replaces real Auth0 in tests
- [ ] API mocks return realistic responses
- [ ] Tests run in <30 seconds locally
- [ ] Tests work in CI without external dependencies
- [ ] 80%+ code coverage for Terminal Mode components
