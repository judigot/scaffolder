// ============================================================================
// Types (always exported)
// ============================================================================
export * from './types';

// ============================================================================
// Client-side (browser)
// ============================================================================

// Storage utilities
export { tokenStorage, userStorage, clearAuthStorage } from './storage';

// API client
export { authApi } from './api';

// ============================================================================
// Server-side
// ============================================================================

// Lucia (session management)
export { initializeLucia, getLucia, Lucia } from './lucia';

// Session management
export {
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  getSessionCookieName,
} from './session';

// Password utilities
export { hashPassword, verifyPassword, validatePassword } from './password';

// OAuth providers (Arctic)
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

// Re-export ID generation from Lucia
export { generateIdFromEntropySize } from 'lucia';
