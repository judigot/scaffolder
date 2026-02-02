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
 * Session type matching base.json schema
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

/**
 * Auth API response
 */
export interface AuthResponse {
  user: User;
  session: Session;
}

/**
 * Auth state in React context
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth context value with actions
 */
export interface AuthContextValue extends Omit<AuthState, 'session'> {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * User with OAuth-provided profile data (optional module)
 */
export interface UserWithProfile extends User {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/**
 * Extended register data with profile fields (optional module)
 */
export interface RegisterDataWithProfile extends RegisterData {
  firstName?: string;
  lastName?: string;
}
