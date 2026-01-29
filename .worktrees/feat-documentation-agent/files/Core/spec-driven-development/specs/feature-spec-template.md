---
id: feature-spec-template
type: template
domain: generic
status: stable
version: 1.0.0
---

# Feature Spec Template

## Purpose

Provide a reusable template for specifying any feature. AI agents use this template to understand requirements, generate implementation, and derive tests.

## When to use

Use this template when:
- Adding a new user-facing feature
- Modifying existing feature behavior
- Planning a feature for AI-assisted implementation

## Required sections

Copy the template below and fill in all sections. Do not skip sections—mark as "N/A" if truly not applicable.

---

# Template: [Feature Name] Specification

```markdown
---
id: [kebab-case-feature-id]
type: feature-spec
domain: [domain-name]
status: draft | in-review | approved | implemented
version: 1.0.0
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
---

# [Feature Name]

## Business Goal

[One paragraph describing why this feature exists and what business value it provides]

## User Personas

| Persona | Description | Primary Goals |
|---------|-------------|---------------|
| [Name] | [Who they are] | [What they want to accomplish] |

## User Stories

### Story 1: [Short Title]

**As a** [persona]
**I want to** [action]
**So that** [benefit]

#### Acceptance Criteria (Given/When/Then)

```gherkin
Scenario: [Scenario name]
  Given [initial context]
  When [action taken]
  Then [expected outcome]
  And [additional outcome if any]
```

### Story 2: [Short Title]

[Repeat format for each story]

## Critical Flows

### Happy Path

1. User [action 1]
2. System [response 1]
3. User [action 2]
4. System [response 2]
5. [Continue until flow complete]

### Alternative Flows

#### [Alternative Flow Name]

- Trigger: [What causes this flow]
- Steps: [Modified flow steps]
- Outcome: [Expected result]

## Edge Cases

| Case | Input/Condition | Expected Behavior |
|------|-----------------|-------------------|
| [Name] | [Description] | [What should happen] |

## Non-Functional Requirements

### Performance

- [ ] [Specific performance target, e.g., "Page loads in < 2s on 3G"]

### Security

- [ ] [Security requirement, e.g., "Input sanitized before storage"]

### Accessibility

- [ ] [A11y requirement, e.g., "All interactive elements keyboard accessible"]

### Observability

- [ ] [Logging/metrics requirement]

### Reliability

- [ ] [Uptime/error handling requirement]

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| [Name] | API / Service / Library | Available / Pending |

## Assumptions

- [Assumption 1]
- [Assumption 2]

## Out of Scope

- [Item explicitly not included in this feature]

## Definition of Done

- [ ] All acceptance criteria implemented
- [ ] Unit tests written for business logic
- [ ] Integration tests for critical flows
- [ ] Edge cases covered with tests
- [ ] Performance targets met
- [ ] Security requirements satisfied
- [ ] Accessibility requirements met
- [ ] Logging/metrics configured
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Test Requirements

### Unit Tests

- [ ] [Specific unit test requirement]

### Integration Tests

- [ ] [Specific integration test requirement]

### E2E Tests (if applicable)

- [ ] [Specific E2E test requirement]
```

---

## Example

Below is a complete example of a feature spec that AI agents can use to derive implementation and tests.

---

```markdown
---
id: user-authentication
type: feature-spec
domain: identity
status: approved
version: 1.0.0
created: 2024-01-15
updated: 2024-01-20
---

# User Authentication

## Business Goal

Enable users to securely access their accounts through email/password authentication, protecting user data while providing a frictionless login experience.

## User Personas

| Persona | Description | Primary Goals |
|---------|-------------|---------------|
| End User | Registered application user | Access account securely and quickly |
| New User | First-time visitor | Create account with minimal friction |

## User Stories

### Story 1: User Login

**As a** registered user
**I want to** log in with my email and password
**So that** I can access my personalized content

#### Acceptance Criteria (Given/When/Then)

```gherkin
Scenario: Successful login with valid credentials
  Given I am on the login page
  And I have a registered account with email "user@example.com"
  When I enter "user@example.com" in the email field
  And I enter my correct password
  And I click the "Sign In" button
  Then I am redirected to the dashboard
  And I see a welcome message with my name

Scenario: Failed login with invalid password
  Given I am on the login page
  When I enter "user@example.com" in the email field
  And I enter an incorrect password
  And I click the "Sign In" button
  Then I remain on the login page
  And I see an error message "Invalid email or password"
  And the password field is cleared

Scenario: Failed login with non-existent email
  Given I am on the login page
  When I enter "nonexistent@example.com" in the email field
  And I enter any password
  And I click the "Sign In" button
  Then I remain on the login page
  And I see an error message "Invalid email or password"
```

### Story 2: User Registration

**As a** new user
**I want to** create an account
**So that** I can use the application

#### Acceptance Criteria (Given/When/Then)

```gherkin
Scenario: Successful registration
  Given I am on the registration page
  When I enter a valid email "newuser@example.com"
  And I enter a password meeting requirements
  And I confirm the password
  And I click "Create Account"
  Then my account is created
  And I receive a confirmation email
  And I am redirected to the onboarding flow

Scenario: Registration with existing email
  Given I am on the registration page
  And an account exists with email "existing@example.com"
  When I enter "existing@example.com"
  And I complete the registration form
  And I click "Create Account"
  Then I see an error "An account with this email already exists"
  And I am offered a link to the login page
```

## Critical Flows

### Happy Path: Login

1. User navigates to /login
2. System displays login form with email and password fields
3. User enters credentials
4. User clicks "Sign In"
5. System validates credentials against stored hash
6. System creates session token
7. System redirects to /dashboard
8. User sees personalized dashboard

### Alternative Flows

#### Forgot Password

- Trigger: User clicks "Forgot Password" link
- Steps:
  1. System displays email input
  2. User enters registered email
  3. System sends password reset link
  4. User clicks link in email
  5. System displays password reset form
  6. User enters new password
  7. System updates password hash
- Outcome: User can log in with new password

## Edge Cases

| Case | Input/Condition | Expected Behavior |
|------|-----------------|-------------------|
| Empty email | User submits with empty email | Show validation error "Email is required" |
| Invalid email format | User enters "notanemail" | Show validation error "Enter a valid email" |
| Empty password | User submits with empty password | Show validation error "Password is required" |
| SQL injection attempt | Email contains SQL syntax | Input sanitized, treated as invalid email |
| Rate limit exceeded | 5+ failed attempts in 1 minute | Show "Too many attempts, try again in 5 minutes" |
| Session expired | User with expired token accesses protected route | Redirect to login with message |

## Non-Functional Requirements

### Performance

- [ ] Login request completes in < 500ms (p95)
- [ ] Password hashing uses bcrypt with cost factor 12

### Security

- [ ] Passwords hashed with bcrypt before storage
- [ ] Session tokens are cryptographically random (256-bit)
- [ ] HTTPS enforced for all auth endpoints
- [ ] Rate limiting: max 5 failed attempts per minute per IP
- [ ] No password hints in error messages

### Accessibility

- [ ] Form inputs have associated labels
- [ ] Error messages announced to screen readers
- [ ] Tab order follows visual layout
- [ ] Focus visible on all interactive elements

### Observability

- [ ] Log all login attempts (success/failure) with timestamp
- [ ] Log failed attempts with anonymized IP
- [ ] Metric: login_attempts_total{status=success|failure}
- [ ] Alert on > 100 failed attempts per minute

### Reliability

- [ ] Auth service handles graceful degradation if database slow
- [ ] Session store supports failover

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| User database | Database | Available |
| Email service | External Service | Available |
| Session store | Cache | Available |

## Assumptions

- Users have valid email addresses
- Email service is configured and operational
- HTTPS termination handled by infrastructure

## Out of Scope

- Social login (OAuth providers)
- Multi-factor authentication
- Single sign-on (SSO)
- Biometric authentication

## Definition of Done

- [ ] All acceptance criteria implemented
- [ ] Unit tests written for business logic
- [ ] Integration tests for critical flows
- [ ] Edge cases covered with tests
- [ ] Performance targets met
- [ ] Security requirements satisfied
- [ ] Accessibility requirements met
- [ ] Logging/metrics configured
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Test Requirements

### Unit Tests

- [ ] Password validation logic
- [ ] Email format validation
- [ ] Session token generation
- [ ] Rate limiting logic

### Integration Tests

- [ ] Full login flow with valid credentials
- [ ] Login failure scenarios
- [ ] Registration flow
- [ ] Password reset flow

### E2E Tests

- [ ] Complete login journey from landing page
- [ ] Registration and first login
- [ ] Password reset email flow
```

---

## Implementation Derivation (for AI Agents)

From the above spec, derive:

```typescript
interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  register(email: string, password: string): Promise<RegistrationResult>;
  resetPassword(email: string): Promise<void>;
  verifyResetToken(token: string): Promise<boolean>;
  updatePassword(token: string, newPassword: string): Promise<void>;
}

interface AuthResult {
  success: boolean;
  token?: string;
  error?: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "ACCOUNT_LOCKED";
}

interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: "EMAIL_EXISTS" | "INVALID_EMAIL" | "WEAK_PASSWORD";
}

const loginHandler = async (
  request: Request
): Promise<Response> => {
  const { email, password } = await parseBody(request);
  
  if (!email) {
    return errorResponse(400, "Email is required");
  }
  
  if (!isValidEmail(email)) {
    return errorResponse(400, "Enter a valid email");
  }
  
  if (!password) {
    return errorResponse(400, "Password is required");
  }
  
  if (await isRateLimited(request.ip)) {
    return errorResponse(429, "Too many attempts, try again in 5 minutes");
  }
  
  const result = await authService.login(email, password);
  
  if (!result.success) {
    await logFailedAttempt(email, request.ip);
    return errorResponse(401, "Invalid email or password");
  }
  
  await logSuccessfulLogin(email);
  return successResponse({ token: result.token, redirect: "/dashboard" });
};
```

## Checklist for AI Agents

Before implementing:

- [ ] Read entire spec including all user stories
- [ ] Identify all Given/When/Then scenarios
- [ ] Note all edge cases in the table
- [ ] Understand non-functional requirements
- [ ] Check dependencies are available

During implementation:

- [ ] Implement each acceptance criterion
- [ ] Write test for each scenario
- [ ] Handle all edge cases
- [ ] Add logging as specified
- [ ] Follow security requirements

After implementation:

- [ ] All acceptance criteria have passing tests
- [ ] Edge case tests pass
- [ ] Performance targets verified
- [ ] Security checklist complete
- [ ] Definition of Done satisfied

