// ============================================================================
// Base Types (always available)
// ============================================================================

/**
 * Core user type matching base.json schema
 * Does not include optional fields from modules (oauth, otp, mfa)
 */
export interface User {
  id: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with password hash (for internal server use only)
 */
export interface UserWithPassword extends User {
  passwordHash: string | null;
}

/**
 * Session type matching base.json schema
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

// ============================================================================
// OAuth Types (from oauth.json module)
// ============================================================================

export type OAuthProvider = 'github' | 'google' | 'facebook' | 'discord';

/**
 * OAuth account linking type matching oauth.json schema
 */
export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
}

/**
 * User info returned from OAuth providers
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// ============================================================================
// OTP Types (from otp.json module)
// ============================================================================

export type OtpType =
  | 'email_verification'
  | 'password_reset'
  | 'login'
  | 'phone_verification';

/**
 * OTP code type matching otp.json schema
 */
export interface OtpCode {
  id: string;
  userId: string;
  code: string;
  type: OtpType;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// MFA Types (from mfa.json module)
// ============================================================================

export type MfaDeviceType = 'totp' | 'webauthn' | 'sms';

/**
 * MFA device type matching mfa.json schema
 */
export interface MfaDevice {
  id: string;
  userId: string;
  name: string;
  type: MfaDeviceType;
  secret: string;
  verified: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Backup code type matching mfa.json schema
 */
export interface BackupCode {
  id: string;
  userId: string;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// Auth Flow Types (used by auth services)
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================================
// Extended User Types (for apps that need more fields)
// ============================================================================

/**
 * User with OAuth-provided profile data
 * Use this when oauth module is enabled
 */
export interface UserWithProfile extends User {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/**
 * Extended register data with optional profile fields
 */
export interface RegisterDataWithProfile extends RegisterData {
  firstName?: string;
  lastName?: string;
}
