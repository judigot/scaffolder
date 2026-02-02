import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { hc } from 'hono/client';

// Import route modules
import productRoutes from './routes/product';
import customerRoutes from './routes/customer';
import orderRoutes from './routes/order';
import orderProductRoutes from './routes/orderProduct';
import userRoutes from './routes/user';
import sessionRoutes from './routes/session';
import oauthAccountRoutes from './routes/oauthAccount';
import profileRoutes from './routes/profile';
import postsRoutes from './routes/post';
import userTypeRoutes from './routes/userType';
import userUserTypeRoutes from './routes/userUserType';
import authRoutes from './routes/auth';
import { db } from './db';
import { session, user } from './db/schema';
import { initializeLucia } from './auth';

// Initialize Lucia authentication
initializeLucia(db, session, user);

const app = new Hono().basePath('/api');

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Health check
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// Mount routes
app.route('/product', productRoutes);
app.route('/customer', customerRoutes);
app.route('/order', orderRoutes);
app.route('/order-product', orderProductRoutes);
app.route('/user', userRoutes);
app.route('/session', sessionRoutes);
app.route('/oauth-account', oauthAccountRoutes);
app.route('/profile', profileRoutes);
app.route('/posts', postsRoutes);
app.route('/user-type', userTypeRoutes);
app.route('/user-user-type', userUserTypeRoutes);
app.route('/auth', authRoutes);

// Export types for RPC client
export type AppType = typeof app;

// Create typed client for use in frontend and tests
export const createClient = (baseUrl: string) => hc<AppType>(baseUrl);

// Start server
const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  console.log(`Server running at http://localhost:${port}`);
}
