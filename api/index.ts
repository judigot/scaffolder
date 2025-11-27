import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config();

const app = express();
const VITE_BACKEND_PORT = (process.env.VITE_BACKEND_PORT ?? 5000).toString();
const platform: string = process.platform;

app.use(express.json());
app.use(cors());

// app.get('/', (_req: Request, res: Response) => {
//   res.send({ message: 'AlienStack' });
// });

// 12 API routes for testing - no '/api' prefix

app.get('/test1', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 1 OK' });
});

app.get('/test2', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 2 OK' });
});

app.get('/test3', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 3 OK' });
});

app.get('/test4', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 4 OK' });
});

app.get('/test5', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 5 OK' });
});

app.get('/test6', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 6 OK' });
});

app.get('/test7', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 7 OK' });
});

app.get('/test8', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 8 OK' });
});

app.get('/test9', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 9 OK' });
});

app.get('/test10', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 10 OK' });
});

app.get('/test11', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 11 OK' });
});

app.get('/test12', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 12 OK' });
});

app.get('/test13', (_req: Request, res: Response) => {
  res.json({ message: 'Test route 13 OK' });
});

app.listen(VITE_BACKEND_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on ${String(process.env.VITE_BACKEND_HOST)}:${VITE_BACKEND_PORT}`,
  );
});

export default app;
