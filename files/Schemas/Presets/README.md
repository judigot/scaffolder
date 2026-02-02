# Auth Schema Presets

Pre-configured combinations of auth modules for common use cases.

## Available Presets

| Preset | Modules | Use Case |
|--------|---------|----------|
| **Basic** | base | Simple apps with email/password only |
| **Social** | base + oauth | Apps with Google/GitHub login |
| **Verified** | base + otp | Apps requiring email verification |
| **Enterprise** | base + oauth + mfa | Secure apps with 2FA |
| **Full** | all modules | Maximum flexibility |

## Usage

In your `structure.yaml`:

```yaml
# Use a preset
$USE_SCHEMA:
  - /Schemas/Presets/Auth - Social

# Or compose your own
$USE_SCHEMA:
  - /Schemas/Auth/base
  - /Schemas/Auth/oauth
  - /Schemas/Auth/otp
```

## Feature Matrix

| Feature | Basic | Social | Verified | Enterprise | Full |
|---------|:-----:|:------:|:--------:|:----------:|:----:|
| Email/Password | ✓ | ✓ | ✓ | ✓ | ✓ |
| OAuth Providers | | ✓ | | ✓ | ✓ |
| OTP Codes | | | ✓ | | ✓ |
| MFA (TOTP) | | | | ✓ | ✓ |
| Backup Codes | | | | ✓ | ✓ |

## Choosing a Preset

- **Basic**: MVPs, internal tools, simple apps
- **Social**: Consumer apps where social login improves UX
- **Verified**: Apps where email verification is required (e.g., newsletters)
- **Enterprise**: B2B SaaS, finance apps, admin portals
- **Full**: Platforms that need all options (let users choose their auth method)
