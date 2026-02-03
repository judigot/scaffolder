import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  createSession,
  invalidateSession,
  generateIdFromEntropySize,
  type User,
  type LoginCredentials,
  type RegisterData,
} from '../auth';
import {
  sessionMiddleware,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  type HonoAuthContext,
} from './middleware';

// Schemas for request validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50).optional(),
});

/**
 * Create auth routes for Hono
 * Requires db and user table to be passed in
 */
export function createAuthRoutes<
  TDb extends { select: () => unknown; insert: () => unknown },
  TUserTable extends { id: unknown; email: unknown; passwordHash: unknown },
>(db: TDb, userTable: TUserTable) {
  const app = new Hono<HonoAuthContext>();

  // Apply session middleware to all routes
  app.use('*', sessionMiddleware());

  // Register new user
  app.post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password, username } = c.req.valid('json');

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({ error: passwordValidation.errors.join(', ') }, 400);
    }

    // Check if email already exists
    const existingUser = await (db as any)
      .select()
      .from(userTable)
      .where(eq((userTable as any).email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = generateIdFromEntropySize(10);

    const [newUser] = await (db as any)
      .insert(userTable)
      .values({
        id: userId,
        email,
        username: username ?? null,
        passwordHash,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create session
    const { session, sessionCookie } = await createSession(userId);
    setSessionCookie(c, sessionCookie);

    // Return user without password hash
    const user: User = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return c.json({ user, session }, 201);
  });

  // Login
  app.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    // Find user by email
    const [user] = await (db as any)
      .select()
      .from(userTable)
      .where(eq((userTable as any).email, email))
      .limit(1);

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password
    if (!user.passwordHash) {
      return c.json(
        {
          error: 'Account uses OAuth login. Please sign in with your provider.',
        },
        401,
      );
    }

    const validPassword = await verifyPassword(user.passwordHash, password);
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Create session
    const { session, sessionCookie } = await createSession(user.id);
    setSessionCookie(c, sessionCookie);

    // Return user without password hash
    const safeUser: User = {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return c.json({ user: safeUser, session });
  });

  // Logout
  app.post('/logout', async (c) => {
    const session = c.get('session');

    if (session) {
      await invalidateSession(session.id);
    }

    clearSessionCookie(c);
    return c.json({ success: true });
  });

  // Get current user
  app.get('/me', requireAuth(), async (c) => {
    const user = c.get('user');
    return c.json({ user });
  });

  // Check session status
  app.get('/session', async (c) => {
    const user = c.get('user');
    const session = c.get('session');

    return c.json({
      authenticated: !!user,
      user,
      session,
    });
  });

  return app;
}

// Export types for use in apps
export type { LoginCredentials, RegisterData, User };
