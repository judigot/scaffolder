# Infrastructure Feature

## Overview

The Infra tab provisions AWS EC2 via Terraform Cloud. Credentials are encrypted client-side (zero-knowledge) and sent per-request — never stored in plaintext on the server.

## What Is Implemented

### AWS Credential Validation

- Validates credentials against AWS STS `GetCallerIdentity` before triggering any Terraform run
- Returns specific error messages for invalid access key ID, incorrect secret access key, or expired session token
- Prevents wasted Terraform Cloud run minutes

### Session Token Handling

- Supports both IAM and STS credentials
- Always upserts `AWS_SESSION_TOKEN` (empty when not provided) to clear stale values

### Zero-Knowledge Encryption

- Credentials encrypted client-side with AES-256-GCM using a passphrase
- Server stores only encrypted blobs in Auth0 `user_metadata.infra`
- Decrypted locally in the browser; sent per-request to the backend
- Passphrase stored in sessionStorage with 24-hour timeout

### Terraform Cloud Integration

- Upserts workspace vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `TF_VAR_enable_ec2`, `TF_VAR_ssh_public_key`
- Triggers auto-apply runs with descriptive messages
- Polls run status every 4 seconds until terminal state
- Fetches outputs (`dev_ip`, `ssh_command`) after completion

### Optimistic Toggle UI

- Toggle flips immediately (TanStack Query `useMutation` with rollback on error)
- Reverts state and shows server error on failure

### Reusable ToggleSwitch Component

- Located at `src/components/UI/ToggleSwitch.tsx`
- Accessible switch with clear on/off states and thumb visibility

### Credential Readiness Checks

- Verifies AWS + TFC credentials and SSH public key are present
- Detects encrypted state when passphrase is missing

### Error Propagation

- Backend returns structured `{ error, message }`
- Frontend displays exact server message, falls back to generic on parse failure

## API Endpoints

| Method | Path                    | Purpose                                               |
| ------ | ----------------------- | ----------------------------------------------------- |
| POST   | `/terraform/status`     | Fetch workspace variables and outputs                 |
| POST   | `/terraform/run`        | Validate credentials, upsert variables, trigger apply |
| POST   | `/terraform/run/:runId` | Poll run status by ID                                 |

## File Map

| File                                         | Role                          |
| -------------------------------------------- | ----------------------------- |
| `src/app/routes/terraform.ts`                | API route handlers            |
| `src/app/services/terraformCloudService.ts`  | TFC API client                |
| `src/app/services/awsCredentialValidator.ts` | AWS STS credential validation |
| `src/components/AI/InfraPanel.tsx`           | Infrastructure control UI     |
| `src/components/UI/ToggleSwitch.tsx`         | Toggle switch component       |
| `src/utils/zeroKnowledgeEncryption.ts`       | Client-side encryption        |
| `src/utils/serverEncryption.ts`              | Server-side utilities         |

## Terraform Cloud Workspace Variables

| Key                     | Category | Sensitive | Purpose                               |
| ----------------------- | -------- | --------- | ------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | env      | Yes       | AWS authentication                    |
| `AWS_SECRET_ACCESS_KEY` | env      | Yes       | AWS authentication                    |
| `AWS_SESSION_TOKEN`     | env      | Yes       | Temporary credentials (empty for IAM) |
| `TF_VAR_enable_ec2`     | env      | No        | Toggle instance on/off                |
| `TF_VAR_ssh_public_key` | env      | Yes       | SSH access to instance                |

## Planned: Multiple Deployments

Goal: manage multiple Terraform Cloud workspaces (e.g., dev/staging/prod) from the Infra tab.

### UI

- Add a plus button at the bottom of the Infra tab to add a new Terraform Cloud workspace
- Show a workspace list with toggles per workspace
- Allow selecting an active workspace for status/outputs

### Data Model

- Store an array in `user_metadata.infra.deployments`
- Each deployment: `{ id, name, organization, workspaceId, lastStatus, lastOutputs }`

### API Changes

- Accept `deploymentId` on `/terraform/status` and `/terraform/run`
- Resolve the workspace by `deploymentId` in the backend

### Backward Compatibility

- If no deployments exist, fall back to the current single-workspace configuration

## Source Reference

`INFRA_V2.md` is the latest detailed design reference and should remain in sync with this file.
