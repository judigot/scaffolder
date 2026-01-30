# Infrastructure Feature — Version 2

## Overview

Toggle EC2 provisioning via Terraform Cloud from the app UI. Credentials are encrypted client-side (zero-knowledge) and sent per-request — never stored in plaintext on the server.

## Features

### AWS Credential Validation

- Validates credentials against AWS STS `GetCallerIdentity` before triggering any Terraform run
- Returns specific error messages for:
  - Invalid access key ID
  - Incorrect secret access key
  - Expired session token
- Prevents wasted Terraform Cloud run minutes on doomed plans

### Session Token Handling

- Supports both permanent IAM credentials (access key + secret) and temporary STS credentials (access key + secret + session token)
- Always upserts `AWS_SESSION_TOKEN` to the workspace — set to empty string when not provided — to clear stale values from previous sessions

### Zero-Knowledge Encryption

- Credentials encrypted client-side with AES-256-GCM using the user's passphrase
- Server stores only encrypted blobs in Auth0 `user_metadata.infra`
- Decrypted locally in the browser; sent per-request to the backend
- Passphrase stored in sessionStorage with 24-hour timeout

### Terraform Cloud Integration

- Upserts workspace environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `TF_VAR_enable_ec2`, `TF_VAR_ssh_public_key`
- Triggers auto-apply runs with descriptive messages
- Polls run status every 4 seconds until terminal state (`applied`, `errored`, `canceled`, `discarded`, `planned_and_finished`)
- Fetches workspace outputs (`dev_ip`, `ssh_command`) after run completion

### Optimistic Toggle UI

- Toggle flips immediately on click — no perceived lag
- Uses TanStack Query `useMutation` with `onMutate` / `onError` rollback
- Reverts to previous state and displays server error message on failure

### Reusable ToggleSwitch Component

- Located at `src/components/UI/ToggleSwitch.tsx`
- Off state: `neutral-700` track with `neutral-600` border — visible on dark backgrounds
- On state: `success-500` (green) track
- White thumb with shadow — always visible regardless of state
- Props: `checked`, `onChange`, `disabled`, `label`
- Accessible: `role="switch"`, `aria-checked`, `aria-label`

### Credential Readiness Checks

- AWS ready: access key, secret key, and SSH public key all present
- TFC ready: API token, organization, and workspace all present
- Encryption check: detects if values are still encrypted (passphrase not entered)
- UI prompts guide the user to add missing credentials or unlock

### Error Propagation

- Backend returns structured `{ error, message }` JSON on failure
- Frontend parses server error body and displays the actual message (e.g., "AWS access key ID is invalid.")
- Falls back to generic message if response body is unparseable

## API Endpoints

| Method | Path                    | Purpose                                               |
| ------ | ----------------------- | ----------------------------------------------------- |
| POST   | `/terraform/status`     | Fetch workspace variables and outputs                 |
| POST   | `/terraform/run`        | Validate credentials, upsert variables, trigger apply |
| POST   | `/terraform/run/:runId` | Poll run status by ID                                 |

## File Map

| File                                         | Role                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `src/app/routes/terraform.ts`                | API route handlers                                    |
| `src/app/services/terraformCloudService.ts`  | TFC API client (workspaces, variables, runs, outputs) |
| `src/app/services/awsCredentialValidator.ts` | AWS STS credential validation with Signature V4       |
| `src/components/AI/InfraPanel.tsx`           | Infrastructure control UI                             |
| `src/components/UI/ToggleSwitch.tsx`         | Reusable toggle switch component                      |
| `src/utils/zeroKnowledgeEncryption.ts`       | Client-side AES-256-GCM encryption                    |
| `src/utils/serverEncryption.ts`              | Server-side encryption utilities                      |

## Terraform Cloud Workspace Variables

| Key                     | Category | Sensitive | Purpose                               |
| ----------------------- | -------- | --------- | ------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | env      | Yes       | AWS authentication                    |
| `AWS_SECRET_ACCESS_KEY` | env      | Yes       | AWS authentication                    |
| `AWS_SESSION_TOKEN`     | env      | Yes       | Temporary credentials (empty for IAM) |
| `TF_VAR_enable_ec2`     | env      | No        | Toggle instance on/off                |
| `TF_VAR_ssh_public_key` | env      | Yes       | SSH access to instance                |
