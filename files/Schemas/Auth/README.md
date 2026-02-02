# Auth Schema Modules

Modular authentication schemas that can be composed based on your app's needs.

## Modules

| Module | Tables | Description |
|--------|--------|-------------|
| `base` | user, session | Core authentication (required) |
| `oauth` | oauthAccount | Social login providers |
| `otp` | otpCode | Email/SMS verification codes |
| `mfa` | mfaDevice, backupCode | Multi-factor authentication |

## Dependencies

```
base (required)
  ├── oauth (optional)
  ├── otp (optional)
  └── mfa (optional)
```

## Usage in structure.yaml

```yaml
$USE_SCHEMA:
  - /Schemas/Auth/base      # Required
  - /Schemas/Auth/oauth     # Add OAuth support
  - /Schemas/Auth/mfa       # Add MFA support
```

Or use a preset:

```yaml
$USE_SCHEMA:
  - /Schemas/Presets/Auth - Social
```

## Base Schema

The `base` module provides:

- **user**: Core user account with email, username, password hash
- **session**: Lucia-compatible session management

```
user
├── id (uuid, primary)
├── email (varchar, unique)
├── username (varchar, unique, nullable)
├── passwordHash (varchar, nullable for OAuth-only)
├── emailVerified (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)

session
├── id (varchar, primary)
├── userId (uuid, FK → user)
└── expiresAt (timestamp)
```

## OAuth Schema

For social login (Google, GitHub, Discord, etc.):

```
oauthAccount
├── id (uuid, primary)
├── userId (uuid, FK → user)
├── provider (varchar: google, github, etc.)
├── providerAccountId (varchar)
├── accessToken (text, nullable)
├── refreshToken (text, nullable)
├── tokenExpiresAt (timestamp, nullable)
└── createdAt (timestamp)
```

## OTP Schema

For email/SMS verification codes:

```
otpCode
├── id (uuid, primary)
├── userId (uuid, FK → user)
├── code (varchar: 6-digit code)
├── type (varchar: email_verification, password_reset, etc.)
├── expiresAt (timestamp)
├── usedAt (timestamp, nullable)
└── createdAt (timestamp)
```

## MFA Schema

For TOTP authenticators and backup codes:

```
mfaDevice
├── id (uuid, primary)
├── userId (uuid, FK → user)
├── name (varchar: device name)
├── type (varchar: totp, webauthn, sms)
├── secret (varchar: encrypted)
├── verified (boolean)
├── lastUsedAt (timestamp, nullable)
└── createdAt (timestamp)

backupCode
├── id (uuid, primary)
├── userId (uuid, FK → user)
├── codeHash (varchar: hashed code)
├── usedAt (timestamp, nullable)
└── createdAt (timestamp)
```

## Framework Adapters

These schemas are framework-agnostic. The scaffolder uses adapters to generate:

- **Drizzle**: TypeScript schema with pgTable definitions
- **Prisma**: Prisma schema file
- **TypeORM**: Entity decorators
- **Raw SQL**: Migration files
