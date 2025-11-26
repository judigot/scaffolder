import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config();

const app = express();
const PORT = (process.env.PORT ?? 5000).toString();
const platform: string = process.platform;

app.use(express.json());
app.use(cors());

app.get('/api', (_req: Request, res: Response) => {
  res.send({ message: 'AlienStack' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on http://localhost:${PORT}`,
  );
});

export default app;
