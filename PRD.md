# Product Requirements Document

## Product

**Working name:** Agent Workspace

**Status:** Future implementation

**Origin:** Repurpose the existing Scaffolder application into a developer-focused encrypted workspace and execution control plane.

## 1. Product Summary

Agent Workspace is a developer tool that lets users manage project-specific configuration and sensitive credentials in a zero-knowledge vault, then use GitHub as a governed control plane for running tasks inside ephemeral GitHub Actions Ubuntu environments.

The core workflow is:

```text
User / ChatGPT
    ↓
Agent Workspace GUI
    ↓
Encrypted project vault
    ↓
GitHub repository / pull request
    ↓
GitHub Actions ephemeral Ubuntu runner
    ↓
Cloud, infrastructure, deployment, browser automation, or development task
```

The product should make it practical to operate development and DevOps workflows from a mobile device without maintaining an always-on personal Linux server.

## 2. Problem

Developers who use AI agents for infrastructure and development work still need a reliable place to:

- store per-project context and credentials;
- manage arbitrary configuration without hand-editing JSON or environment files;
- safely deliver only the required secrets to an execution environment;
- execute commands in a real Linux environment;
- preserve governance, review history, and auditability;
- avoid maintaining permanent worker servers;
- operate the workflow from desktop or mobile.

Existing password managers solve secret storage but not task execution. CI platforms provide ephemeral runners but are not designed as interactive AI workspaces. AI coding tools often assume a local machine or a vendor-controlled execution environment.

Agent Workspace combines these concerns into one developer workflow.

## 3. Product Goals

1. Provide a simple GUI for creating projects and arbitrary project fields.
2. Keep sensitive vault contents zero-knowledge to the application backend.
3. Use GitHub login as the initial authentication method.
4. Use a GitHub App to grant repository access independently from login.
5. Use GitHub Actions as the primary ephemeral Linux execution environment.
6. Preserve GitHub pull requests and commits as durable task and change records.
7. Allow the product to scale from a single-user personal tool to a multi-user SaaS.
8. Reuse as much of the existing Scaffolder Vite/React/Bun/Hono architecture as practical.
9. Avoid predefined infrastructure-provider schemas so new tools can be supported without database migrations.
10. Keep the initial service footprint small and inexpensive.

## 4. Non-Goals for V1

- Building a general-purpose cloud IDE.
- Replacing GitHub Actions.
- Hosting permanent user compute.
- Providing a full password-manager replacement.
- Supporting every source-control provider.
- Enterprise SSO and directory sync at launch.
- Kubernetes or a self-hosted runner fleet.
- Complex workflow orchestration or durable queues unless real usage requires them.
- Automatic unattended access to a user's zero-knowledge vault without an explicitly designed delegation mechanism.

## 5. Target Users

### Primary

Developers and DevOps engineers who:

- work heavily through AI assistants;
- use GitHub as their source-of-truth and review system;
- want disposable Linux environments;
- manage multiple projects, cloud accounts, domains, deployments, or automation tasks;
- want to work effectively from mobile devices;
- do not want to operate an always-on server for agent execution.

### Future

- small engineering teams;
- consultants managing multiple client environments;
- infrastructure engineers;
- AI-first development teams;
- agencies that need isolated project vaults and governed execution.

## 6. Core Concepts

### 6.1 User

An authenticated developer.

Authentication should initially use GitHub OAuth.

### 6.2 Project

A logical workspace representing a client, application, infrastructure environment, experiment, or other unit of work.

A project may have a first-class display name for usability, but the product must not impose a fixed configuration schema.

### 6.3 Vault

A project's sensitive arbitrary data stored as an encrypted payload.

Example decrypted vault contents:

```json
{
  "AWS_REGION": "us-east-1",
  "AWS_ACCESS_KEY_ID": "...",
  "AWS_SECRET_ACCESS_KEY": "...",
  "DOMAIN_NAME": "example.com",
  "DATABASE_URL": "...",
  "VERCEL_PROJECT_ID": "...",
  "CLIENT_NOTES": "...",
  "ANY_FUTURE_KEY": "..."
}
```

These keys are examples only. They must not become predefined database columns.

### 6.4 GitHub Connection

Authentication and repository authorization are separate concerns.

```text
Sign in with GitHub
    ↓
Identifies the user

Install GitHub App
    ↓
Authorizes selected repositories
```

A user should be able to authenticate with GitHub while granting the Agent Workspace GitHub App access only to selected repositories.

### 6.5 Execution

A task is materialized into a GitHub-controlled workflow and executed on an ephemeral GitHub Actions runner.

The runner may execute tools such as:

- shell commands;
- Terraform;
- AWS CLI;
- Vercel CLI;
- Node.js / Bun;
- Python;
- Playwright;
- database migrations;
- deployment scripts;
- tests and linters;
- other CLI-driven developer tools.

## 7. Product Experience

### 7.1 Authentication

V1 should support:

- Sign in with GitHub.
- Persistent application session.
- Logout.
- Account record mapped to the authenticated GitHub identity.

The preferred implementation candidate is Better Auth with GitHub as the initial social provider.

Alternative managed services may be evaluated later, including Clerk or WorkOS AuthKit, particularly if enterprise requirements become important.

### 7.2 Project List

Users should be able to:

- create a project;
- rename a project;
- open a project;
- archive/delete a project;
- see the associated GitHub repository or repositories;
- see recent execution status.

### 7.3 Vault Editor

The vault UI should behave more like a flexible snippet/key-value manager than a conventional CRUD form.

Requirements:

- Add arbitrary fields.
- Rename arbitrary fields.
- Remove arbitrary fields.
- Edit values.
- Support secret and non-secret display modes.
- Copy values when explicitly requested.
- Group or tag fields later without changing the underlying application schema.
- Never require a database migration to support a new provider-specific field.

Possible future field metadata:

```ts
interface VaultEntry {
  id: string;
  key: string;
  value: string;
  type?: "text" | "secret" | "multiline" | "json";
  tags?: string[];
}
```

The entire sensitive payload should still be encrypted before persistence.

### 7.4 Lock / Unlock

The application should clearly distinguish between:

- authenticated application session; and
- unlocked zero-knowledge vault.

A logged-in user should not automatically imply that the server can decrypt the vault.

The browser derives or receives the vault encryption key according to the final cryptographic design and decrypts vault contents locally.

### 7.5 Task Creation

A user should be able to select a project and initiate a task.

The product should eventually support task creation from:

- the web/mobile GUI;
- ChatGPT or another agent integration;
- a repository-backed task file;
- future API integrations.

A task should include only the minimum project context and credentials required for its execution.

### 7.6 Task Governance

The recommended model is:

```text
Task requested
    ↓
Branch created
    ↓
Reviewed task/configuration change
    ↓
Pull request
    ↓
CI / policy checks
    ↓
Merge or explicit approval
    ↓
GitHub Actions execution
```

Different projects may support less strict execution modes later, but high-risk operations should retain explicit approval boundaries.

### 7.7 Execution Results

The GUI should display:

- task status;
- associated repository;
- branch / PR;
- GitHub Actions run;
- start and finish times;
- success or failure;
- link to execution logs;
- concise result metadata.

Sensitive runner output must not be copied into application logs or database records by default.

## 8. Zero-Knowledge Vault Requirements

### 8.1 Security Boundary

Sensitive vault plaintext must be encrypted and decrypted in the client whenever practical.

The application backend and database should persist ciphertext, not plaintext credentials.

The server may know non-sensitive metadata such as:

- user ID;
- project ID;
- project display name;
- encrypted vault version;
- timestamps;
- GitHub installation ID;
- repository mappings;
- execution metadata.

The server should not need to know the contents of arbitrary sensitive vault entries.

### 8.2 Cryptography

Initial implementation should use well-established browser cryptography rather than custom cryptographic primitives.

Candidate primitives:

- Web Crypto API;
- AES-GCM for authenticated encryption;
- a strong password/key derivation design such as Argon2id where practical, or an appropriate Web Crypto-supported derivation strategy;
- unique random salt and nonce/IV values according to the selected primitive's requirements.

The final encryption envelope must be versioned so cryptographic parameters can be upgraded later.

Example conceptual envelope:

```json
{
  "version": 1,
  "algorithm": "AES-GCM",
  "kdf": "...",
  "salt": "...",
  "iv": "...",
  "ciphertext": "..."
}
```

### 8.3 Recovery

Zero-knowledge encryption creates a recovery tradeoff.

If the application does not possess the decryption key, it cannot silently recover a forgotten vault secret.

The product must communicate this clearly and eventually support an intentional recovery/export strategy rather than weakening encryption invisibly.

### 8.4 Runner Secret Delivery

This is a critical architectural problem and must be designed separately from vault persistence.

A true zero-knowledge backend cannot independently decrypt vault contents for an unattended runner.

Interactive execution may follow a flow such as:

```text
User unlocks vault locally
    ↓
Browser decrypts required fields
    ↓
Browser prepares a short-lived execution secret package
    ↓
Authorized GitHub Actions run obtains only required secrets
    ↓
Task executes
    ↓
Temporary package expires / is destroyed
```

The exact transport must be threat-modeled before implementation.

Do not solve this by permanently storing the vault decryption key on the application backend.

### 8.5 Future Automation Mode

A future unattended mode may allow users to explicitly delegate specific credentials for scheduled or autonomous tasks.

This must be represented as a separate security mode rather than being described as zero-knowledge interactive storage.

## 9. Proposed Technical Stack

### Frontend

- Vite
- React 19
- TypeScript
- MUI
- TanStack Query
- Zustand
- Zod

### Backend

- Bun
- Hono
- TypeScript

### Authentication

Preferred for the new product:

- Better Auth
- GitHub OAuth initially

Existing Scaffolder Auth0 implementation can be removed or migrated when this product work begins.

### Database

- Neon PostgreSQL
- Drizzle ORM preferred for the new thin application data model

Prisma remains an acceptable alternative if reusing existing implementation proves substantially cheaper.

### Vault Cryptography

- Web Crypto API
- versioned encrypted payloads
- authenticated encryption

### GitHub

- GitHub App
- Octokit
- GitHub repositories as execution/control-plane state
- GitHub pull requests as review/task records
- GitHub Actions as ephemeral Ubuntu execution environments

### Hosting

- Vercel for the application and API
- Neon for PostgreSQL
- GitHub for repositories and execution

No permanent compute service is required for V1.

## 10. Service Stack

```text
Vercel
├── Vite application
└── Hono API deployment

Neon
└── PostgreSQL application metadata + encrypted vault blobs

GitHub
├── OAuth identity provider
├── GitHub App
├── repositories
├── pull requests
└── GitHub Actions runners
```

Optional future services:

- Stripe — billing and subscriptions
- Sentry — application error monitoring
- Resend / Postmark / SES — transactional email
- object storage — large artifacts or vault exports
- WorkOS — enterprise SSO / directory sync if required

## 11. Data Model

The database should model application entities rather than provider-specific configuration.

Conceptual schema:

```text
User
├── id
├── authProviderUserId
├── createdAt
└── updatedAt

Project
├── id
├── userId / organizationId
├── name
├── createdAt
└── updatedAt

Vault
├── id
├── projectId
├── encryptedBlob
├── encryptionVersion
├── createdAt
└── updatedAt

GitHubInstallation
├── id
├── userId / organizationId
├── installationId
└── metadata

ProjectRepository
├── projectId
├── installationId
├── repositoryId
├── owner
└── name

Execution
├── id
├── projectId
├── repositoryId
├── status
├── branch
├── pullRequestNumber
├── workflowRunId
├── createdAt
└── completedAt
```

Provider configuration such as AWS, Vercel, database, DNS, Twilio, or future services must not require adding provider-specific database columns.

## 12. GitHub Architecture

### Authentication

GitHub OAuth answers:

> Who is this user?

### Authorization

The GitHub App answers:

> Which repositories may Agent Workspace access, and with what permissions?

### Execution

GitHub Actions answers:

> Where does the task run?

This separation should remain explicit throughout the architecture.

## 13. Execution Security

1. Use least-privilege GitHub App permissions.
2. Grant repository access only through explicit GitHub App installations.
3. Prefer short-lived task credentials when providers support them.
4. Never print secrets to Actions logs intentionally.
5. Do not persist complete decrypted vault payloads on runners.
6. Inject only the fields required for the current task.
7. Treat pull requests and protected branches as governance boundaries.
8. Require explicit approval for destructive or high-risk operations where appropriate.
9. Use ephemeral GitHub-hosted runners by default.
10. Avoid long-lived SSH servers as part of the normal execution architecture.

## 14. Multi-User and SaaS Readiness

V1 can begin as a single-user product, but the application model should avoid assumptions that prevent later expansion.

The system should eventually support:

- multiple users;
- organizations / teams;
- organization projects;
- repository access controls;
- roles and permissions;
- usage limits;
- subscription plans;
- execution quotas;
- audit metadata;
- enterprise identity.

Do not implement these prematurely, but use stable IDs and ownership boundaries that allow them to be added.

## 15. Mobile-First Requirements

Mobile usage is a primary product differentiator, not an afterthought.

The UI should allow a developer to perform core operations from a phone:

- sign in;
- unlock vault;
- switch projects;
- add/edit project fields;
- connect GitHub repositories;
- inspect pending changes;
- approve or open GitHub PRs;
- initiate execution;
- inspect status and concise results;
- jump to GitHub logs when deeper debugging is required.

Complex raw JSON editing should never be required for normal project setup.

## 16. Migration / Repurposing Strategy

Agent Workspace should be developed by repurposing Scaffolder rather than rewriting from scratch unless the existing structure becomes a concrete blocker.

Preserve where useful:

- Vite;
- React;
- TypeScript;
- Bun;
- Hono;
- MUI;
- TanStack Query;
- Zustand;
- Zod;
- Octokit;
- existing Vercel deployment support;
- reusable zero-knowledge/encryption concepts already implemented in Scaffolder.

Remove or isolate Scaffolder-specific code generation features as the new product boundary becomes established.

Authentication may migrate from Auth0 to Better Auth.

Database persistence may be introduced through Neon when the multi-user application model is implemented.

## 17. Implementation Phases

### Phase 0 — Design Extraction

- identify reusable Scaffolder components;
- document existing vault/encryption implementation;
- identify Scaffolder-specific features to remove;
- establish the new product name and repository strategy;
- threat-model vault storage and runner secret delivery.

### Phase 1 — Personal Vault MVP

- GitHub login;
- project CRUD;
- arbitrary field editor;
- client-side encryption/decryption;
- encrypted persistence;
- mobile-friendly project/vault UI;
- no autonomous runner secret delivery yet.

### Phase 2 — GitHub Control Plane

- GitHub App installation flow;
- repository selection;
- project-to-repository mapping;
- task creation;
- branch/PR generation;
- GitHub Actions invocation through repository changes;
- execution status UI.

### Phase 3 — Secure Interactive Execution

- selective vault field injection;
- short-lived secret delivery mechanism;
- runner consumption protocol;
- expiry and cleanup;
- execution policy controls;
- redaction and leak testing.

### Phase 4 — Multi-User SaaS

- organizations / teams;
- invitations;
- roles;
- usage records;
- quotas;
- Stripe subscriptions;
- audit metadata;
- improved onboarding.

### Phase 5 — Advanced Agent Platform

- reusable task templates;
- provider integrations;
- scheduled/delegated execution mode;
- ChatGPT integration improvements;
- agent-generated PR workflows;
- richer policies;
- optional enterprise auth.

## 18. V1 Success Criteria

The MVP is successful when a developer can:

1. sign in with GitHub;
2. create a project from a phone or desktop;
3. add arbitrary project configuration without touching JSON;
4. lock the vault and confirm the backend stores only encrypted payload data;
5. unlock the vault locally;
6. connect an authorized GitHub repository;
7. initiate a safe test task;
8. have the task execute in a GitHub-hosted Ubuntu runner;
9. see the execution result from the Agent Workspace UI;
10. complete the workflow without maintaining a personal server.

## 19. Key Product Risks

### Secret transport

Securely delivering decrypted secrets from an interactive zero-knowledge vault to an ephemeral runner is the most important unresolved security design problem.

### GitHub Actions limitations

GitHub Actions is optimized for CI/CD, not as a general interactive compute platform. Rate limits, concurrency, maximum runtime, billing, startup latency, and acceptable-use constraints must be considered as usage grows.

### Vendor dependency

The product relies substantially on GitHub and initially Vercel/Neon. Interfaces should remain modular enough to replace services where practical.

### Zero-knowledge claims

Marketing must match the actual cryptographic boundary. If a future automation feature gives the server access to delegated secrets, that capability must not be presented as equivalent to the interactive zero-knowledge mode.

### Scope expansion

The product can easily become an IDE, password manager, CI platform, infrastructure dashboard, and AI agent simultaneously. V1 should remain focused on encrypted project context + governed ephemeral execution.

## 20. Open Decisions

- Final product name.
- Whether Agent Workspace remains in the Scaffolder repository or becomes a new repository after extraction.
- Better Auth versus keeping Auth0 during the first implementation phase.
- Drizzle versus Prisma.
- Exact vault key derivation and recovery design.
- Exact secure runner secret-delivery protocol.
- Whether encrypted blobs live directly in Neon or in object storage later.
- How ChatGPT initiates tasks in the public-product version.
- Free-tier execution limits and GitHub Actions cost model.
- How execution approvals differ between low-risk and destructive tasks.

## 21. Product Principle

The product should preserve one simple idea:

> Give an AI-assisted developer a disposable Linux workstation, governed through GitHub, with project secrets controlled by the developer.

The GUI exists to remove tedious configuration work. GitHub exists to provide durable governance and execution. The vault exists to ensure that sensitive project context does not need to become plaintext application data.
