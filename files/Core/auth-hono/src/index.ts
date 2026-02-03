// Middleware
export {
  sessionMiddleware,
  requireAuth,
  requireVerifiedEmail,
  getUser,
  getSession,
  clearSessionCookie,
  setSessionCookie,
  type AuthContext,
  type HonoAuthContext,
} from './middleware';

// Routes factory
export { createAuthRoutes } from './routes';

// Re-export auth-services for convenience
export {
  // Types
  type User,
  type Session,
  type LoginCredentials,
  type RegisterData,
  type AuthResponse,
  type AuthState,
  type OAuthProvider,
  type OAuthAccount,
  type OAuthUserInfo,
  type OtpCode,
  type OtpType,
  type MfaDevice,
  type MfaDeviceType,
  type BackupCode,
  type UserWithPassword,
  type UserWithProfile,
  type RegisterDataWithProfile,
  // Server functions
  initializeLucia,
  getLucia,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  getSessionCookieName,
  hashPassword,
  verifyPassword,
  validatePassword,
  generateIdFromEntropySize,
  // OAuth
  initializeOAuthProviders,
  getOAuthProvider,
  isProviderConfigured,
  getConfiguredProviders,
  fetchOAuthUserInfo,
  generateState,
  generateCodeVerifier,
} from '../auth';
