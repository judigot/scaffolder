// ============================================================================
// Types (always exported)
// ============================================================================
export * from './types';

// ============================================================================
// Server-side only - client auth is in src/lib/auth-client or Core/auth-react
// ============================================================================

export {
  createBetterAuth,
  initializeBetterAuth,
  getBetterAuth,
  getSessionCookieName,
  generateIdFromEntropySize,
  SESSION_COOKIE_NAME,
} from './better-auth';

export { initializeLucia, getLucia } from './lucia';

export {
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
} from './session';

export { hashPassword, verifyPassword, validatePassword } from './password';

export {
  initializeOAuthProviders,
  getOAuthProvider,
  isProviderConfigured,
  getConfiguredProviders,
  fetchOAuthUserInfo,
  GitHub,
  Google,
  Facebook,
  Discord,
  generateState,
  generateCodeVerifier,
} from './oauth-providers';
