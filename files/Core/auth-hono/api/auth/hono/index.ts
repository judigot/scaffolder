export { betterAuthHandler } from './handler';
export {
  sessionMiddleware,
  requireAuth,
  requireVerifiedEmail,
  getUser,
  getSession,
  type AuthContext,
  type HonoAuthContext,
} from './middleware';
