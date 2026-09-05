# BYO Terraform Cloud

Users bring their own Terraform Cloud (free tier) credentials. No server-side TFC env vars are needed.

## Architecture

```
Client                          Server                      Terraform Cloud
──────                          ──────                      ───────────────
1. User enters TFC creds
   in profile (token/org/ws)
2. Encrypt with passphrase ──►  3. Store encrypted blob
                                   in Auth0 user_metadata
4. Decrypt locally with
   passphrase on page load
5. Send decrypted creds     ──► 6. Use creds to call    ──► 7. TFC API
   with each API request           TFC APIs (transient)
```

The server never stores plaintext TFC credentials. They are passed per-request and discarded after use.

## Credentials Stored

All stored in `user_metadata.infra` (encrypted with zero-knowledge passphrase):

| Field | Description |
|-------|-------------|
| `sshPublicKey` | SSH public key for EC2 instances |
| `awsAccessKeyId` | AWS access key |
| `awsSecretAccessKey` | AWS secret key |
| `awsSessionToken` | AWS session token (optional) |
| `tfcToken` | Terraform Cloud API token |
| `tfcOrg` | Terraform Cloud organization name |
| `tfcWorkspace` | Terraform Cloud workspace name |

## API Endpoints

All endpoints require `Authorization: Bearer <auth0_token>` header.

### POST `/terraform/status`

Fetches current workspace variable state and outputs.

**Body:**
```json
{
  "tfcToken": "string",
  "tfcOrg": "string",
  "tfcWorkspace": "string"
}
```

**Response:**
```json
{
  "success": true,
  "enableEc2": true,
  "outputs": { "dev_ip": "1.2.3.4", "ssh_command": "ssh ec2-user@..." }
}
```

### POST `/terraform/run`

Upserts workspace variables and triggers a run with auto-apply.

**Body:**
```json
{
  "enableEc2": true,
  "awsAccessKeyId": "string",
  "awsSecretAccessKey": "string",
  "awsSessionToken": "string (optional)",
  "sshPublicKey": "string",
  "tfcToken": "string",
  "tfcOrg": "string",
  "tfcWorkspace": "string"
}
```

**Variables upserted:**
- `AWS_ACCESS_KEY_ID` (env, sensitive)
- `AWS_SECRET_ACCESS_KEY` (env, sensitive)
- `AWS_SESSION_TOKEN` (env, sensitive, optional)
- `TF_VAR_ssh_public_key` (env, sensitive)
- `TF_VAR_enable_ec2` (env, not sensitive — `"true"` or `"false"`)

### POST `/terraform/run/:runId`

Polls run status.

**Body:**
```json
{
  "tfcToken": "string",
  "tfcOrg": "string",
  "tfcWorkspace": "string"
}
```

### POST `/user-metadata/infra`

Saves encrypted infra credentials to Auth0.

**Body:**
```json
{
  "infra": {
    "sshPublicKey": "encrypted_blob",
    "awsAccessKeyId": "encrypted_blob",
    "awsSecretAccessKey": "encrypted_blob",
    "awsSessionToken": "encrypted_blob_or_empty",
    "tfcToken": "encrypted_blob",
    "tfcOrg": "encrypted_blob",
    "tfcWorkspace": "encrypted_blob"
  }
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/services/terraformCloudService.ts` | TFC API client (accepts config per call) |
| `src/app/routes/terraform.ts` | Terraform route handlers |
| `src/app/routes/userMetadata.ts` | Infra credential storage route |
| `src/components/AI/InfraPanel.tsx` | Toggle UI, status polling |
| `src/components/UserProfile.tsx` | Credential input form + encryption |
| `src/utils/zeroKnowledgeEncryption.ts` | Client-side encrypt/decrypt |
| `src/utils/decryptUserMetadata.ts` | Decryption helpers (generic key iteration) |
| `src/hooks/useDecryptedUserMetadata.ts` | Hook providing decrypted metadata |

## Encryption Flow

1. User sets a passphrase (min 12 chars, stored only in sessionStorage)
2. Each credential value is encrypted with AES-256-GCM using PBKDF2-derived key (`userId:passphrase` as key material)
3. Encrypted blob is JSON: `{ encrypted, salt, iv }` (base64-encoded)
4. Server stores the JSON string in Auth0 `user_metadata.infra`
5. On load, client checks if values are encrypted (`parseEncryptedValue`), prompts for passphrase if needed, decrypts locally

## UX States (InfraPanel)

| State | Behavior |
|-------|----------|
| No TFC creds | Blue "Connect Terraform Cloud" CTA with link to profile |
| TFC set, no AWS/SSH | Warning to add AWS + SSH credentials |
| All set but encrypted (locked) | Warning to unlock with passphrase |
| All ready | Toggle enabled, status fetched on mount |

## Constraints

- Terraform Cloud SaaS only (`https://app.terraform.io`). No Enterprise/custom hosts.
- Free tier compatible (single workspace, API token auth).
- Runs use `auto-apply: true` — no manual confirmation step.
- TFC token is never returned in plaintext by the server after save.
