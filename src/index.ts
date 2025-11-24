import express, { type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'node:path';
import dotenv from 'dotenv';
import process from 'node:process';
import router from '@/routes/index.ts';

dotenv.config();

const app = express();
const PORT = (process.env.PORT ?? 5000).toString();
const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const publicDirectory = path.join(__dirname, 'public');

// Enable middleware
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());
app.use(express.static(publicDirectory));

// Define routes
app.get('/', (_req: Request, res: Response) => {
  const isDevelopment: boolean = String(process.env.NODE_ENV) === 'development';

  if (isDevelopment) {
    res.redirect(String(process.env.VITE_FRONTEND_URL));
    return;
  }

  res.sendFile(publicDirectory);
});

// Use routes from the routes folder
app.use(router);

// Start server only in development
if (!import.meta.env.PROD) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on http://127.0.0.1:${PORT}`,
    );
  });
}

// Export for Vercel serverless function
export default app;
